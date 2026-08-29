import { prisma } from "@/lib/prisma";
import { requireRole, type SessionUser } from "@/server/auth/session";
import { TimeEntryNotModifiableError } from "./actions";
import { logAudit } from "@/server/audit/log";
import { formatTimeInParis } from "@/lib/dates";

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
  const entry = await prisma.timeEntry.findUniqueOrThrow({
    where: { id },
    include: { user: { select: { firstName: true, lastName: true } }, site: { select: { name: true } } },
  });
  if (entry.status !== "SUBMITTED") {
    throw new TimeEntryNotModifiableError("Seul un pointage soumis peut être validé.");
  }
  const updated = await prisma.timeEntry.update({
    where: { id },
    data: { status: "VALIDATED", validatedById: user.id, validatedAt: new Date() },
  });
  await logAudit(prisma, {
    actorUserId: user.id,
    action: "TIME_VALIDATED",
    entityType: "TimeEntry",
    entityId: id,
    summary: `Pointage validé : ${entry.user.firstName} ${entry.user.lastName} — ${entry.site.name} ${formatTimeInParis(entry.clockInAt)}–${entry.clockOutAt ? formatTimeInParis(entry.clockOutAt) : "?"}`,
  });
  return updated;
}

export async function rejectTimeEntry(user: SessionUser, id: string) {
  requireRole(user, [...REVIEW_ROLES]);
  const entry = await prisma.timeEntry.findUniqueOrThrow({
    where: { id },
    include: { user: { select: { firstName: true, lastName: true } }, site: { select: { name: true } } },
  });
  if (entry.status !== "SUBMITTED") {
    throw new TimeEntryNotModifiableError("Seul un pointage soumis peut être rejeté.");
  }
  const updated = await prisma.timeEntry.update({
    where: { id },
    data: { status: "REJECTED", validatedById: user.id, validatedAt: new Date() },
  });
  await logAudit(prisma, {
    actorUserId: user.id,
    action: "TIME_REJECTED",
    entityType: "TimeEntry",
    entityId: id,
    summary: `Pointage rejeté : ${entry.user.firstName} ${entry.user.lastName} — ${entry.site.name} ${formatTimeInParis(entry.clockInAt)}–${entry.clockOutAt ? formatTimeInParis(entry.clockOutAt) : "?"}`,
  });
  return updated;
}
