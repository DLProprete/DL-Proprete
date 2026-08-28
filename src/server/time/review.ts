import { prisma } from "@/lib/prisma";
import { requireRole, type SessionUser } from "@/server/auth/session";
import { TimeEntryNotModifiableError } from "./actions";

const REVIEW_ROLES = ["ADMIN", "PLANNER"] as const;

// File d'attente de validation : tout pointage SUBMITTED, quelle que soit
// sa date (pas seulement "la veille" — un pointage en retard reste à
// traiter). Le plus ancien d'abord.
export async function listTimeEntriesForReview(user: SessionUser) {
  requireRole(user, [...REVIEW_ROLES]);
  return prisma.timeEntry.findMany({
    where: { status: "SUBMITTED" },
    include: {
      user: { select: { firstName: true, lastName: true } },
      site: { select: { name: true } },
    },
    orderBy: { clockInAt: "asc" },
  });
}

export async function validateTimeEntry(user: SessionUser, id: string) {
  requireRole(user, [...REVIEW_ROLES]);
  const entry = await prisma.timeEntry.findUniqueOrThrow({ where: { id } });
  if (entry.status !== "SUBMITTED") {
    throw new TimeEntryNotModifiableError("Seul un pointage soumis peut être validé.");
  }
  return prisma.timeEntry.update({
    where: { id },
    data: { status: "VALIDATED", validatedById: user.id, validatedAt: new Date() },
  });
}

export async function rejectTimeEntry(user: SessionUser, id: string) {
  requireRole(user, [...REVIEW_ROLES]);
  const entry = await prisma.timeEntry.findUniqueOrThrow({ where: { id } });
  if (entry.status !== "SUBMITTED") {
    throw new TimeEntryNotModifiableError("Seul un pointage soumis peut être rejeté.");
  }
  return prisma.timeEntry.update({
    where: { id },
    data: { status: "REJECTED", validatedById: user.id, validatedAt: new Date() },
  });
}
