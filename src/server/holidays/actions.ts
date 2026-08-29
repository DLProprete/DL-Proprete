import { prisma } from "@/lib/prisma";
import { requireRole, type SessionUser } from "@/server/auth/session";
import { frenchHolidays } from "@/lib/holidays-fr";

const MANAGE_ROLES = ["ADMIN"] as const;

export async function importHolidays(user: SessionUser, year: number) {
  requireRole(user, [...MANAGE_ROLES]);
  const holidays = frenchHolidays(year);
  const result = await prisma.holiday.createMany({
    data: holidays.map((h) => ({ date: h.date, name: h.name, scope: "COMPANY" as const })),
    skipDuplicates: true,
  });
  return { imported: result.count };
}
