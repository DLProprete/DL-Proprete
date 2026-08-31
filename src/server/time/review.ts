import { prisma } from "@/lib/prisma";
import { requireRole, type SessionUser } from "@/server/auth/session";
import { TimeEntryNotModifiableError } from "./actions";
import { logAudit } from "@/server/audit/log";
import { formatTimeInParis } from "@/lib/dates";

const REVIEW_ROLES = ["ADMIN", "PLANNER"] as const;
const PAGE_SIZE = 25;

export type TimeEntryReviewFilters = {
  userId?: string;
  siteId?: string;
  from?: Date;
  /** Borne exclusive — passer le lendemain du dernier jour à inclure. */
  to?: Date;
  page?: number;
};

// File d'attente de validation : tout pointage SUBMITTED, quelle que soit
// sa date (pas seulement "la veille" — un pointage en retard reste à
// traiter). Le plus ancien d'abord. Le shift est inclus pour calculer
// l'écart au créneau prévu (voir review-flags.ts) — sans lui, impossible
// de distinguer un pointage hors planning d'un simple retard.
export async function listTimeEntriesForReview(
  user: SessionUser,
  filters: TimeEntryReviewFilters = {},
) {
  requireRole(user, [...REVIEW_ROLES]);
  const page = filters.page && filters.page > 0 ? filters.page : 1;

  const where = {
    status: "SUBMITTED" as const,
    ...(filters.userId ? { userId: filters.userId } : {}),
    ...(filters.siteId ? { siteId: filters.siteId } : {}),
    ...(filters.from || filters.to
      ? { clockInAt: { ...(filters.from ? { gte: filters.from } : {}), ...(filters.to ? { lt: filters.to } : {}) } }
      : {}),
  };

  const [items, total] = await Promise.all([
    prisma.timeEntry.findMany({
      where,
      include: {
        user: { select: { firstName: true, lastName: true } },
        site: { select: { name: true } },
        shift: { select: { startAt: true, endAt: true } },
      },
      orderBy: { clockInAt: "asc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.timeEntry.count({ where }),
  ]);

  return { items, total, page, pageSize: PAGE_SIZE };
}

// Agents pour le filtre de l'écran de validation — pas listTeam()
// (team/queries.ts), réservé ADMIN : ce module est accessible ADMIN+PLANNER.
export async function listAgentsForReview(user: SessionUser) {
  requireRole(user, [...REVIEW_ROLES]);
  return prisma.user.findMany({
    where: { role: "AGENT" },
    orderBy: { lastName: "asc" },
    select: { id: true, firstName: true, lastName: true },
  });
}

// Validation en masse des cas normaux : reutilise validateTimeEntry telle
// quelle pour chaque entree (une ligne d'audit par pointage, cf. M1 — un
// bulk qui n'ecrirait qu'un seul log vague perdrait le detail "qui/quoi").
// Skip silencieux si l'entree a deja ete traitee entretemps par quelqu'un
// d'autre (course rare, pas une erreur a remonter a l'ecran).
export async function validateTimeEntriesBulk(user: SessionUser, ids: string[]) {
  requireRole(user, [...REVIEW_ROLES]);
  const result = { validated: [] as string[], skipped: [] as string[] };
  for (const id of ids) {
    try {
      await validateTimeEntry(user, id);
      result.validated.push(id);
    } catch (error) {
      if (error instanceof TimeEntryNotModifiableError) {
        result.skipped.push(id);
        continue;
      }
      throw error;
    }
  }
  return result;
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
