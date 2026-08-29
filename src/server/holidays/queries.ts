import { prisma } from "@/lib/prisma";
import { requireRole, type SessionUser } from "@/server/auth/session";
import { dateOnlyUTC } from "@/lib/dates";

const MANAGE_ROLES = ["ADMIN"] as const;

export async function listHolidays(user: SessionUser, year: number) {
  requireRole(user, [...MANAGE_ROLES]);
  return prisma.holiday.findMany({
    where: { date: { gte: dateOnlyUTC(year, 1, 1), lt: dateOnlyUTC(year + 1, 1, 1) } },
    orderBy: { date: "asc" },
  });
}
