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

// Pour le formulaire "Ajouter un site à ce contrat" : ne proposer que les
// sites du client concerné, pas tous les sites de l'outil.
export async function listSitesForClient(user: SessionUser, clientId: string) {
  requireRole(user, [...MANAGE_ROLES]);
  return prisma.site.findMany({
    where: { clientId },
    orderBy: { name: "asc" },
  });
}

export async function getSite(user: SessionUser, id: string) {
  requireRole(user, [...MANAGE_ROLES]);
  return prisma.site.findUnique({
    where: { id },
    include: { client: true, contractSites: { include: { contract: true } } },
  });
}
