import { prisma } from "@/lib/prisma";
import { requireRole, type SessionUser } from "@/server/auth/session";

const MANAGE_ROLES = ["ADMIN", "PLANNER"] as const;

export async function listProspects(user: SessionUser) {
  requireRole(user, [...MANAGE_ROLES]);
  return prisma.prospect.findMany({
    orderBy: [{ nextFollowUpAt: { sort: "asc", nulls: "last" } }, { createdAt: "desc" }],
  });
}

export async function getProspect(user: SessionUser, id: string) {
  requireRole(user, [...MANAGE_ROLES]);
  return prisma.prospect.findUnique({ where: { id } });
}
