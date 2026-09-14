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
      site: {
        select: {
          id: true,
          name: true,
          address: true,
          city: true,
          accessNotes: true,
          alarmCode: true,
          keyNotes: true,
          protocolNotes: true,
          onSiteContactName: true,
          onSiteContactPhone: true,
        },
      },
      serviceTemplate: { select: { instructions: true } },
      timeEntries: {
        where: { userId: user.id },
        select: { id: true, status: true, clockInAt: true, clockOutAt: true },
      },
    },
    orderBy: { startAt: "asc" },
  });
}

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

export async function getAgentMonthlyHours(user: SessionUser, year: number, month: number) {
  requireRole(user, ["AGENT"]);
  const { start, end } = monthRange(year, month);
  const [validatedEntries, pendingCount] = await Promise.all([
    prisma.timeEntry.findMany({
      where: {
        userId: user.id,
        status: "VALIDATED",
        clockInAt: { gte: start, lt: end },
      },
      include: { site: { select: { name: true } }, shift: { select: { startAt: true, endAt: true } } },
      orderBy: { clockInAt: "asc" },
    }),
    prisma.timeEntry.count({
      where: { userId: user.id, status: "SUBMITTED", clockInAt: { gte: start, lt: end } },
    }),
  ]);
  // Décision du 12/09 : un pointage lié à une vacation compte pour sa durée
  // PLANIFIÉE, pas mesurée (clockInAt n'est plus une heure d'arrivée
  // réelle) — seul un pointage hors planning retombe sur clockOutAt -
  // clockInAt, faute d'alternative.
  const totalMinutes = validatedEntries.reduce((sum, entry) => {
    if (entry.shift) return sum + (entry.shift.endAt.getTime() - entry.shift.startAt.getTime()) / 60_000;
    return sum + (entry.clockOutAt ? (entry.clockOutAt.getTime() - entry.clockInAt.getTime()) / 60_000 : 0);
  }, 0);
  return { totalHours: totalMinutes / 60, entries: validatedEntries, pendingCount };
}

export async function getAgentGreetingName(user: SessionUser) {
  requireRole(user, ["AGENT"]);
  const row = await prisma.user.findUniqueOrThrow({
    where: { id: user.id },
    select: { firstName: true },
  });
  return row.firstName;
}
