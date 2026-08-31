import { prisma } from "@/lib/prisma";
import { assertOwnData, requireRole, type SessionUser } from "@/server/auth/session";

export class TimeEntryAlreadyOpenError extends Error {}
export class TimeEntryNotModifiableError extends Error {}
export class TimeEntryTooShortError extends Error {}

// Sous ce seuil, il s'agit d'un double-tap Démarrer/Terminer, pas d'un
// vrai pointage (ex. 15:53–15:53) — cf. docs/DATA-MODEL.md, clockOutAt >
// clockInAt exigé. Même style de constante que SCHEDULE_TOLERANCE_MINUTES
// dans agent-schedule.ts.
const MIN_DURATION_MINUTES = 5;

// Pointage "hors planning" (sans shiftId, avec choix manuel du site) n'est
// pas construit cette session — hors périmètre demandé ("planning du jour,
// boutons Démarrer et Terminer"). startTimeEntry accepte déjà un shiftId
// optionnel pour ne pas fermer la porte plus tard.
export async function startTimeEntry(user: SessionUser, shiftId: string) {
  requireRole(user, ["AGENT"]);

  const existingOpen = await prisma.timeEntry.findFirst({
    where: { userId: user.id, status: "OPEN" },
  });
  if (existingOpen) {
    throw new TimeEntryAlreadyOpenError("Un pointage est déjà en cours pour cet agent.");
  }

  const shift = await prisma.shift.findUniqueOrThrow({ where: { id: shiftId } });

  return prisma.timeEntry.create({
    data: {
      userId: user.id,
      siteId: shift.siteId,
      shiftId: shift.id,
      clockInAt: new Date(),
      status: "OPEN",
      source: "MOBILE",
    },
  });
}

export async function endTimeEntry(user: SessionUser, timeEntryId: string) {
  requireRole(user, ["AGENT"]);

  const entry = await prisma.timeEntry.findUniqueOrThrow({ where: { id: timeEntryId } });
  assertOwnData(user, entry.userId);

  if (entry.status !== "OPEN") {
    throw new TimeEntryNotModifiableError("Ce pointage n'est plus modifiable.");
  }

  const clockOutAt = new Date();
  const durationMinutes = (clockOutAt.getTime() - entry.clockInAt.getTime()) / 60_000;
  if (durationMinutes < MIN_DURATION_MINUTES) {
    throw new TimeEntryTooShortError(
      `Pointage trop court (moins de ${MIN_DURATION_MINUTES} min) : vérifiez l'heure de début.`,
    );
  }

  return prisma.timeEntry.update({
    where: { id: timeEntryId },
    data: { clockOutAt, status: "SUBMITTED" },
  });
}
