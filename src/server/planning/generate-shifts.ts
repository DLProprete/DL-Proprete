import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRole, type SessionUser } from "@/server/auth/session";
import { addDays, dateOnlyUTC, parisToday, parisWallTimeToUTC } from "@/lib/dates";

const MANAGE_ROLES = ["ADMIN", "PLANNER"] as const;
const WINDOW_DAYS = 56; // 8 semaines glissantes

// Idempotent grâce à l'index unique (serviceTemplateId, date, startAt) posé
// en Session 1 : createMany + skipDuplicates ignore silencieusement les
// occurrences déjà générées, pas besoin de les recharger pour comparer.
export async function generateShifts(user: SessionUser) {
  requireRole(user, [...MANAGE_ROLES]);

  const today = parisToday();
  const windowStart = dateOnlyUTC(today.year, today.month, today.day);
  const windowEnd = addDays(windowStart, WINDOW_DAYS);

  const contracts = await prisma.contract.findMany({
    where: { status: "ACTIVE" },
    include: { serviceTemplates: { where: { isActive: true } } },
  });

  const rows: Prisma.ShiftCreateManyInput[] = [];

  for (const contract of contracts) {
    for (const template of contract.serviceTemplates) {
      for (let cursor = windowStart; cursor <= windowEnd; cursor = addDays(cursor, 1)) {
        if (cursor < contract.startsOn || cursor > contract.endsOn) continue;

        const weekday = cursor.getUTCDay(); // 0=dimanche..6=samedi
        const dayOfWeek = weekday === 0 ? 7 : weekday; // 1=lundi..7=dimanche
        if (!template.daysOfWeek.includes(dayOfWeek)) continue;

        const year = cursor.getUTCFullYear();
        const month = cursor.getUTCMonth() + 1;
        const day = cursor.getUTCDate();

        const startAt = parisWallTimeToUTC(
          year,
          month,
          day,
          template.startTime.getUTCHours(),
          template.startTime.getUTCMinutes(),
        );
        let endAt = parisWallTimeToUTC(
          year,
          month,
          day,
          template.endTime.getUTCHours(),
          template.endTime.getUTCMinutes(),
        );
        if (endAt <= startAt) {
          // Vacation traversant minuit (rare mais possible) : fin le lendemain.
          endAt = addDays(endAt, 1);
        }

        rows.push({
          serviceTemplateId: template.id,
          siteId: contract.siteId,
          contractId: contract.id,
          date: dateOnlyUTC(year, month, day),
          startAt,
          endAt,
          requiredAgents: template.requiredAgents,
          status: "UNSTAFFED",
          generatedFromTemplate: true,
        });
      }
    }
  }

  if (rows.length === 0) {
    return { created: 0, candidates: 0 };
  }

  const result = await prisma.shift.createMany({ data: rows, skipDuplicates: true });
  return { created: result.count, candidates: rows.length };
}
