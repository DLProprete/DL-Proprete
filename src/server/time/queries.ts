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
    include: {
      site: { select: { id: true, name: true, address: true, city: true, accessNotes: true } },
      serviceTemplate: { select: { instructions: true } },
      timeEntries: {
        where: { userId: user.id },
        select: { id: true, status: true, clockInAt: true, clockOutAt: true },
      },
    },
    orderBy: { startAt: "asc" },
  });
}

// Pour la salutation "Bonjour, X" : le jeu de démo nomme les agents
// "Agent Un"/"Agent Deux" (firstName générique + lastName distinctif), donc
// lastName est la partie qui identifie réellement la personne ici. À
// revoir si de vrais comptes (prénom/nom classiques) remplacent la démo.
export async function getAgentGreetingName(user: SessionUser) {
  requireRole(user, ["AGENT"]);
  const row = await prisma.user.findUniqueOrThrow({
    where: { id: user.id },
    select: { lastName: true },
  });
  return row.lastName;
}
