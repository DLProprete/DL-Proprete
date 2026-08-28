import { prisma } from "@/lib/prisma";
import { requireRole, type SessionUser } from "@/server/auth/session";

const MANAGE_ROLES = ["ADMIN", "PLANNER"] as const;

export async function listClients(user: SessionUser) {
  requireRole(user, [...MANAGE_ROLES]);
  return prisma.client.findMany({ orderBy: { legalName: "asc" } });
}

export async function getClient(user: SessionUser, id: string) {
  requireRole(user, [...MANAGE_ROLES]);
  return prisma.client.findUnique({
    where: { id },
    include: { sites: { orderBy: { name: "asc" } }, contracts: true },
  });
}
