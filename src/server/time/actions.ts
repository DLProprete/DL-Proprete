import { prisma } from "@/lib/prisma";
import { requireRole, type SessionUser } from "@/server/auth/session";

export class TimeEntryAlreadyExistsError extends Error {}
export class TimeEntryNotModifiableError extends Error {}
export class NotAssignedError extends Error {}

// Un seul geste agent par vacation : "Terminer" crée ET clôt le pointage
// dans le même appel — décision du 12/09, l'entreprise ne veut plus
// tracer d'heure d'arrivée. clockInAt est figé sur l'heure prévue du
// shift (jamais une heure observée) ; clockOutAt reste le seul instant
// réel, conservé comme trace interne de fin de prestation. L'ancien
// garde-fou "durée minimale de 5 min" (double-tap Démarrer/Terminer)
// disparaît avec lui : un seul pointage possible par vacation suffit à
// empêcher un doublon, voir l'idempotence ci-dessous.
export async function completeTimeEntry(user: SessionUser, shiftId: string, note?: string) {
  requireRole(user, ["AGENT"]);

  // Le shiftId vient du client (Server Action) : sans cette vérification,
  // un agent pourrait pointer — et être payé — sur la vacation d'un
  // collègue en fournissant simplement un autre ID (trouvé en audit de
  // sécurité du 15/09, jamais signalé comme anomalie à la relecture
  // puisque l'entrée reste liée à un vrai Shift).
  const assignment = await prisma.assignment.findFirst({
    where: { userId: user.id, shiftId, status: "ASSIGNED" },
  });
  if (!assignment) {
    throw new NotAssignedError("Vous n'êtes pas affecté à cette vacation.");
  }

  const existing = await prisma.timeEntry.findFirst({
    where: { userId: user.id, shiftId },
  });
  if (existing) {
    throw new TimeEntryAlreadyExistsError("Cette vacation a déjà été pointée.");
  }

  const shift = await prisma.shift.findUniqueOrThrow({ where: { id: shiftId } });

  return prisma.timeEntry.create({
    data: {
      userId: user.id,
      siteId: shift.siteId,
      shiftId: shift.id,
      clockInAt: shift.startAt,
      clockOutAt: new Date(),
      status: "SUBMITTED",
      source: "MOBILE",
      note: note?.trim() || null,
    },
  });
}
