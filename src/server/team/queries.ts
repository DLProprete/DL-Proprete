import { prisma } from "@/lib/prisma";
import { requireRole, type SessionUser } from "@/server/auth/session";

const MANAGE_ROLES = ["ADMIN"] as const;

export async function listTeam(user: SessionUser) {
  requireRole(user, [...MANAGE_ROLES]);
  return prisma.user.findMany({ where: { role: "AGENT" }, orderBy: { lastName: "asc" } });
}

export async function getAgent(user: SessionUser, id: string) {
  requireRole(user, [...MANAGE_ROLES]);
  return prisma.user.findUnique({ where: { id, role: "AGENT" } });
}
