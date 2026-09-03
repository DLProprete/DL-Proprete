import { prisma } from "@/lib/prisma";
import { requireRole, type SessionUser } from "@/server/auth/session";

const MANAGE_ROLES = ["ADMIN", "PLANNER"] as const;

export async function listQuotesForProspect(user: SessionUser, prospectId: string) {
  requireRole(user, [...MANAGE_ROLES]);
  return prisma.quote.findMany({
    where: { prospectId },
    orderBy: { createdAt: "desc" },
    include: { lines: true },
  });
}

export async function getQuote(user: SessionUser, id: string) {
  requireRole(user, [...MANAGE_ROLES]);
  return prisma.quote.findUnique({
    where: { id },
    include: { prospect: true, lines: true },
  });
}
