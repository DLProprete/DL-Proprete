import { prisma } from "@/lib/prisma";
import { requireRole, type SessionUser } from "@/server/auth/session";

const MANAGE_ROLES = ["ADMIN"] as const;
// Pas ADMIN : sa création n'est pas demandée par l'audit (Mo6) et reste
// hors de /team.
const MANAGED_MEMBER_ROLES = ["AGENT", "PLANNER"] as const;

export async function listTeam(user: SessionUser) {
  requireRole(user, [...MANAGE_ROLES]);
  return prisma.user.findMany({
    where: { role: { in: [...MANAGED_MEMBER_ROLES] } },
    orderBy: { lastName: "asc" },
  });
}

export async function getAgent(user: SessionUser, id: string) {
  requireRole(user, [...MANAGE_ROLES]);
  return prisma.user.findUnique({ where: { id, role: { in: [...MANAGED_MEMBER_ROLES] } } });
}
