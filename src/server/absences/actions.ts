import { prisma } from "@/lib/prisma";
import { requireRole, type SessionUser } from "@/server/auth/session";
import { absenceInputSchema } from "@/lib/zod/absence";
import { recomputeShiftStatus } from "@/server/planning/assignments";

export class AbsenceNotPendingError extends Error {}
export class MissingSickDocumentError extends Error {}

export async function declareAbsence(user: SessionUser, input: unknown) {
  requireRole(user, ["AGENT"]);
  const data = absenceInputSchema.parse(input);
  return prisma.absence.create({
    data: {
      userId: user.id,
      type: data.type,
      startsOn: data.startsOn,
      endsOn: data.endsOn,
      comment: data.comment,
      documentPath: data.documentPath,
      status: "PENDING",
    },
  });
}

// Approbation ADMIN uniquement (SPEC §2 : PLANNER valide les pointages, pas
// les absences). Fait passer les Assignment ASSIGNED de l'agent sur la
// période en REPLACED, et recalcule le statut des Shift concernés — ils
// redeviennent UNSTAFFED/PARTIALLY_STAFFED, jamais touchés côté facturation
// (régie au prévu, indépendante du pointage/de l'affectation).
export async function approveAbsence(user: SessionUser, id: string) {
  requireRole(user, ["ADMIN"]);
  const absence = await prisma.absence.findUniqueOrThrow({ where: { id } });
  if (absence.status !== "PENDING") {
    throw new AbsenceNotPendingError("Cette absence n'est plus en attente.");
  }
  if (absence.type === "SICK" && !absence.documentPath) {
    throw new MissingSickDocumentError("Justificatif manquant pour cet arrêt maladie.");
  }

  const affectedAssignments = await prisma.assignment.findMany({
    where: {
      userId: absence.userId,
      status: "ASSIGNED",
      shift: { date: { gte: absence.startsOn, lte: absence.endsOn } },
    },
    select: { id: true, shiftId: true },
  });

  await prisma.$transaction([
    prisma.absence.update({ where: { id }, data: { status: "APPROVED" } }),
    ...affectedAssignments.map((assignment) =>
      prisma.assignment.update({ where: { id: assignment.id }, data: { status: "REPLACED" } }),
    ),
  ]);

  for (const assignment of affectedAssignments) {
    await recomputeShiftStatus(assignment.shiftId);
  }

  return prisma.absence.findUniqueOrThrow({ where: { id } });
}

export async function rejectAbsence(user: SessionUser, id: string) {
  requireRole(user, ["ADMIN"]);
  const absence = await prisma.absence.findUniqueOrThrow({ where: { id } });
  if (absence.status !== "PENDING") {
    throw new AbsenceNotPendingError("Cette absence n'est plus en attente.");
  }
  return prisma.absence.update({ where: { id }, data: { status: "REJECTED" } });
}
