import { prisma } from "@/lib/prisma";
import { requireRole, type SessionUser } from "@/server/auth/session";
import { dateOnlyUTC, parisToday } from "@/lib/dates";
import { paidLeaveDaysTaken } from "./leave-balance";

export async function listMyAbsences(user: SessionUser) {
  requireRole(user, ["AGENT"]);
  return prisma.absence.findMany({
    where: { userId: user.id },
    orderBy: { startsOn: "desc" },
  });
}

// Mo9 : le "pris" se calcule depuis les Absence existantes ; l'"acquis"
// (paidLeaveBalance) est saisi à la main par un ADMIN sur /team, jamais
// calculé ici — voir server/absences/leave-balance.ts.
export async function getMyLeaveBalance(user: SessionUser, year: number) {
  requireRole(user, ["AGENT"]);
  const [profile, absences] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: user.id }, select: { paidLeaveBalance: true } }),
    prisma.absence.findMany({
      where: { userId: user.id, type: "PAID_LEAVE", status: "APPROVED" },
      select: { type: true, status: true, startsOn: true, endsOn: true },
    }),
  ]);
  return {
    year,
    acquired: profile.paidLeaveBalance !== null ? Number(profile.paidLeaveBalance) : null,
    taken: paidLeaveDaysTaken(absences, year),
  };
}

// Équivalent ADMIN, pour afficher le "pris" à côté du champ de saisie de
// l'acquis sur /team/[agentId] — même calcul, scope différent (n'importe
// quel agent, pas seulement soi-même).
export async function getAgentLeaveBalance(user: SessionUser, agentId: string, year: number) {
  requireRole(user, ["ADMIN"]);
  const absences = await prisma.absence.findMany({
    where: { userId: agentId, type: "PAID_LEAVE", status: "APPROVED" },
    select: { type: true, status: true, startsOn: true, endsOn: true },
  });
  return { year, taken: paidLeaveDaysTaken(absences, year) };
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
