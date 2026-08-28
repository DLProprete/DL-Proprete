import { prisma } from "@/lib/prisma";
import { requireRole, type SessionUser } from "@/server/auth/session";
import { addDays, dateOnlyUTC, parisToday } from "@/lib/dates";

export async function listTodayShiftsForAgent(user: SessionUser) {
  requireRole(user, ["AGENT"]);
  const today = parisToday();
  const day = dateOnlyUTC(today.year, today.month, today.day);
  const dayEnd = addDays(day, 1);
  return prisma.shift.findMany({
    where: {
      date: { gte: day, lt: dayEnd },
      assignments: { some: { userId: user.id, status: "ASSIGNED" } },
    },
    include: { site: { select: { id: true, name: true } } },
    orderBy: { startAt: "asc" },
  });
}

export async function getOpenTimeEntry(user: SessionUser) {
  requireRole(user, ["AGENT"]);
  return prisma.timeEntry.findFirst({
    where: { userId: user.id, status: "OPEN" },
    include: { site: { select: { name: true } }, shift: { select: { id: true } } },
  });
}
