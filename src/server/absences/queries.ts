import { prisma } from "@/lib/prisma";
import { requireRole, type SessionUser } from "@/server/auth/session";
import { dateOnlyUTC, parisToday } from "@/lib/dates";

export async function listMyAbsences(user: SessionUser) {
  requireRole(user, ["AGENT"]);
  return prisma.absence.findMany({
    where: { userId: user.id },
    orderBy: { startsOn: "desc" },
  });
}

export async function listPendingAbsences(user: SessionUser) {
  requireRole(user, ["ADMIN"]);
  return prisma.absence.findMany({
    where: { status: "PENDING" },
    include: { user: { select: { firstName: true, lastName: true } } },
    orderBy: { startsOn: "asc" },
  });
}

// Shifts (à venir) touchés par une absence approuvée et pas encore
// repourvus.
export async function listShiftsNeedingReplacement(user: SessionUser) {
  requireRole(user, ["ADMIN"]);
  const today = parisToday();
  const todayDate = dateOnlyUTC(today.year, today.month, today.day);

  return prisma.shift.findMany({
    where: {
      date: { gte: todayDate },
      status: { in: ["UNSTAFFED", "PARTIALLY_STAFFED"] },
      assignments: { some: { status: "REPLACED" } },
    },
    include: {
      site: { select: { name: true } },
      assignments: {
        where: { status: "REPLACED" },
        include: { user: { select: { firstName: true, lastName: true } } },
      },
    },
    orderBy: [{ date: "asc" }, { startAt: "asc" }],
  });
}
