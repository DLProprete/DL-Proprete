import { prisma } from "@/lib/prisma";
import { assertOwnData, requireRole, type SessionUser } from "@/server/auth/session";

export class TimeEntryAlreadyOpenError extends Error {}
export class TimeEntryNotModifiableError extends Error {}

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

  return prisma.timeEntry.update({
    where: { id: timeEntryId },
    data: { clockOutAt: new Date(), status: "SUBMITTED" },
  });
}
