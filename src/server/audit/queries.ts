import { prisma } from "@/lib/prisma";
import { requireRole, type SessionUser } from "@/server/auth/session";
import type { AuditAction } from "./log";

const MANAGE_ROLES = ["ADMIN"] as const;
const PAGE_SIZE = 25;

export type AuditLogFilters = {
  from?: Date;
  /** Borne exclusive — passer le lendemain du dernier jour à inclure. */
  to?: Date;
  actorUserId?: string;
  action?: AuditAction;
  page?: number;
};

export async function listAuditLogs(user: SessionUser, filters: AuditLogFilters = {}) {
  requireRole(user, [...MANAGE_ROLES]);
  const page = filters.page && filters.page > 0 ? filters.page : 1;

  const where = {
    ...(filters.from || filters.to
      ? { createdAt: { ...(filters.from ? { gte: filters.from } : {}), ...(filters.to ? { lt: filters.to } : {}) } }
      : {}),
    ...(filters.actorUserId ? { actorUserId: filters.actorUserId } : {}),
    ...(filters.action ? { action: filters.action } : {}),
  };

  const [items, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: { actor: { select: { firstName: true, lastName: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.auditLog.count({ where }),
  ]);

  return { items, total, page, pageSize: PAGE_SIZE };
}

// Seuls ADMIN/PLANNER déclenchent les actions journalisées ci-dessus —
// liste des acteurs possibles pour le filtre.
export async function listActors(user: SessionUser) {
  requireRole(user, [...MANAGE_ROLES]);
  return prisma.user.findMany({
    where: { role: { in: ["ADMIN", "PLANNER"] } },
    orderBy: { lastName: "asc" },
  });
}
