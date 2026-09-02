import { prisma } from "@/lib/prisma";
import { requireRole, type SessionUser } from "@/server/auth/session";

const MANAGE_ROLES = ["ADMIN", "PLANNER"] as const;

export async function listContracts(user: SessionUser) {
  requireRole(user, [...MANAGE_ROLES]);
  return prisma.contract.findMany({
    orderBy: { startsOn: "desc" },
    include: {
      client: { select: { legalName: true } },
      contractSites: { include: { site: { select: { name: true } } } },
    },
  });
}

export async function getContract(user: SessionUser, id: string) {
  requireRole(user, [...MANAGE_ROLES]);
  return prisma.contract.findUnique({
    where: { id },
    include: {
      client: true,
      contractSites: {
        orderBy: { createdAt: "asc" },
        include: {
          site: true,
          serviceTemplates: {
            orderBy: { name: "asc" },
            include: { serviceExceptions: { orderBy: { date: "asc" } } },
          },
        },
      },
    },
  });
}
