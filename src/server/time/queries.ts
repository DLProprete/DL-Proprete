import { prisma } from "@/lib/prisma";
import { requireRole, type SessionUser } from "@/server/auth/session";
import { addDays, dateOnlyUTC, monthRange, parisToday, startOfWeekMonday } from "@/lib/dates";

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

// Planning de la semaine (SPEC.md §10 : "planning du jour / de la
// semaine"), en complément de listTodayShiftsForAgent. weekOffset=0 =
// semaine en cours, -1/+1 = précédente/suivante.
export async function listWeekShiftsForAgent(user: SessionUser, weekOffset = 0) {
  requireRole(user, ["AGENT"]);
  const today = parisToday();
  const todayDate = dateOnlyUTC(today.year, today.month, today.day);
  const monday = addDays(startOfWeekMonday(todayDate), weekOffset * 7);
  const weekEnd = addDays(monday, 7);
  const shifts = await prisma.shift.findMany({
    where: {
      date: { gte: monday, lt: weekEnd },
      assignments: { some: { userId: user.id, status: "ASSIGNED" } },
    },
    include: {
      site: { select: { id: true, name: true, address: true, city: true } },
      timeEntries: {
        where: { userId: user.id },
        select: { id: true, status: true, clockInAt: true, clockOutAt: true },
      },
    },
    orderBy: { startAt: "asc" },
  });
  return { monday, shifts };
}

// Heures du mois (SPEC.md §2 : "consultation de ses heures du mois").
// Même calcul que getValidatedHoursForContractMonth (billing/queries.ts),
// scope userId au lieu de siteId : seules les heures VALIDATED comptent
// dans le total (séparation prévu/réalisé appliquée partout ailleurs) ;
// pendingCount permet à l'agent de comprendre qu'un pointage récent n'est
// pas oublié, juste pas encore validé par un ADMIN/PLANNER.
export async function getAgentMonthlyHours(user: SessionUser, year: number, month: number) {
  requireRole(user, ["AGENT"]);
  const { start, end } = monthRange(year, month);

  const [validatedEntries, pendingCount] = await Promise.all([
    prisma.timeEntry.findMany({
      where: {
        userId: user.id,
        status: "VALIDATED",
        clockInAt: { gte: start, lt: end },
        clockOutAt: { not: null },
      },
      include: { site: { select: { name: true } } },
      orderBy: { clockInAt: "asc" },
    }),
    prisma.timeEntry.count({
      where: { userId: user.id, status: "SUBMITTED", clockInAt: { gte: start, lt: end } },
    }),
  ]);

  const totalMinutes = validatedEntries.reduce(
    (sum, entry) => sum + (entry.clockOutAt!.getTime() - entry.clockInAt.getTime()) / 60_000,
    0,
  );

  return { totalHours: totalMinutes / 60, entries: validatedEntries, pendingCount };
}

// Pour la salutation "Bonjour, X" : le prénom est l'usage normal (le jeu
// de démo "Agent Un"/"Agent Deux" rend ça "Bonjour, Agent" — attendu,
// c'est un prénom générique de démo, pas un vrai compte).
export async function getAgentGreetingName(user: SessionUser) {
  requireRole(user, ["AGENT"]);
  const row = await prisma.user.findUniqueOrThrow({
    where: { id: user.id },
    select: { firstName: true },
  });
  return row.firstName;
}
