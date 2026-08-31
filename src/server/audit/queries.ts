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
  /**
   * Filtre texte, pas une jointure Client : l'audit est polymorphique
   * (entityType/entityId), jamais "Client" en pratique, et le nom du
   * client apparaît déjà dans `summary` pour les actions facture.
   */
  hideTestData?: boolean;
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
    // Sensible à la casse volontairement : les fixtures/seed de ce dépôt
    // écrivent toujours "Test" avec un T majuscule ("Client Test
    // Facturation", "C-TEST-..."), alors qu'un texte libre en français
    // (ex. une note "Client conteste la facture") contient "test" en
    // minuscule dans un vrai mot — insensible à la casse masquerait ces
    // entrées légitimes par défaut.
    ...(filters.hideTestData
      ? {
          NOT: {
            OR: [{ entityType: { contains: "Test" } }, { summary: { contains: "Test" } }],
          },
        }
      : {}),
  };

  const [items, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
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
