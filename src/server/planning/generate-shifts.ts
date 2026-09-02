import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRole, type SessionUser } from "@/server/auth/session";
import { addDays, dateOnlyUTC, formatDateOnly, parisToday, parisWallTimeToUTC } from "@/lib/dates";

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
    include: {
      contractSites: {
        include: { serviceTemplates: { where: { isActive: true } } },
      },
    },
  });

  const holidays = await prisma.holiday.findMany({
    where: { date: { gte: windowStart, lte: windowEnd } },
  });
  const holidaySet = new Set(holidays.map((h) => formatDateOnly(h.date)));

  const exceptions = await prisma.serviceException.findMany({
    where: { date: { gte: windowStart, lte: windowEnd } },
  });
  // SKIP l'emporte toujours ; EXTRA force la génération un jour normalement
  // non planifié ou un jour férié (voir docs de session : priorité générateur).
  const skipKeys = new Set<string>();
  const extraKeys = new Set<string>();
  for (const exception of exceptions) {
    const dateKey = formatDateOnly(exception.date);
    const bucket = exception.type === "SKIP" ? skipKeys : extraKeys;
    if (exception.serviceTemplateId) bucket.add(`t:${exception.serviceTemplateId}:${dateKey}`);
    if (exception.siteId) bucket.add(`s:${exception.siteId}:${dateKey}`);
  }

  const rows: Prisma.ShiftCreateManyInput[] = [];

  for (const contract of contracts) {
    for (const contractSite of contract.contractSites) {
      for (const template of contractSite.serviceTemplates) {
        for (let cursor = windowStart; cursor <= windowEnd; cursor = addDays(cursor, 1)) {
          if (cursor < contract.startsOn || cursor > contract.endsOn) continue;

          const dateKey = formatDateOnly(cursor);
          const templateKey = `t:${template.id}:${dateKey}`;
          const siteKey = `s:${contractSite.siteId}:${dateKey}`;
          if (skipKeys.has(templateKey) || skipKeys.has(siteKey)) continue;

          const isExtra = extraKeys.has(templateKey) || extraKeys.has(siteKey);
          const weekday = cursor.getUTCDay(); // 0=dimanche..6=samedi
          const dayOfWeek = weekday === 0 ? 7 : weekday; // 1=lundi..7=dimanche
          const isScheduledWeekday = template.daysOfWeek.includes(dayOfWeek);
          if (!isScheduledWeekday && !isExtra) continue;
          if (holidaySet.has(dateKey) && !isExtra) continue;

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
            siteId: contractSite.siteId,
            contractSiteId: contractSite.id,
            date: dateOnlyUTC(year, month, day),
            startAt,
            endAt,
            requiredAgents: template.requiredAgents,
            // Duree vendue figee ici : une modification ulterieure du contrat ne
            // doit pas changer retroactivement une periode deja facturee.
            billableMinutes: template.durationMinutes,
            status: "UNSTAFFED",
            generatedFromTemplate: true,
          });
        }
      }
    }
  }

  if (rows.length === 0) {
    return { created: 0, candidates: 0 };
  }

  const result = await prisma.shift.createMany({ data: rows, skipDuplicates: true });
  return { created: result.count, candidates: rows.length };
}
