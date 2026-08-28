import { prisma } from "@/lib/prisma";
import { requireRole, type SessionUser } from "@/server/auth/session";

const MANAGE_ROLES = ["ADMIN", "PLANNER"] as const;

export async function listSites(user: SessionUser) {
  requireRole(user, [...MANAGE_ROLES]);
  return prisma.site.findMany({
    orderBy: { name: "asc" },
    include: { client: { select: { legalName: true } } },
  });
}

export async function getSite(user: SessionUser, id: string) {
  requireRole(user, [...MANAGE_ROLES]);
  return prisma.site.findUnique({
    where: { id },
    include: { client: true, contracts: true },
  });
}
