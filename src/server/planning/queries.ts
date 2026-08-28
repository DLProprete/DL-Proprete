import { prisma } from "@/lib/prisma";
import { requireRole, type SessionUser } from "@/server/auth/session";
import { addDays } from "@/lib/dates";

const MANAGE_ROLES = ["ADMIN", "PLANNER"] as const;

const shiftInclude = {
  site: { select: { id: true, name: true } },
  serviceTemplate: { select: { name: true } },
  assignments: {
    where: { status: "ASSIGNED" as const },
    include: { user: { select: { id: true, firstName: true, lastName: true } } },
  },
};

export async function listShiftsForWeek(user: SessionUser, weekStart: Date) {
  requireRole(user, [...MANAGE_ROLES]);
  const weekEnd = addDays(weekStart, 7);
  return prisma.shift.findMany({
    where: { date: { gte: weekStart, lt: weekEnd } },
    include: shiftInclude,
    orderBy: [{ date: "asc" }, { startAt: "asc" }],
  });
}

export async function listShiftsForDay(user: SessionUser, day: Date) {
  requireRole(user, [...MANAGE_ROLES]);
  const dayEnd = addDays(day, 1);
  return prisma.shift.findMany({
    where: { date: { gte: day, lt: dayEnd } },
    include: shiftInclude,
    orderBy: [{ site: { name: "asc" } }, { startAt: "asc" }],
  });
}

export async function listAgents(user: SessionUser) {
  requireRole(user, [...MANAGE_ROLES]);
  return prisma.user.findMany({
    where: { role: "AGENT", isActive: true },
    orderBy: { lastName: "asc" },
  });
}
