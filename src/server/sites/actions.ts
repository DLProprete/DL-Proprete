import { prisma } from "@/lib/prisma";
import { requireRole, type SessionUser } from "@/server/auth/session";
import { siteInputSchema } from "@/lib/zod/site";

const MANAGE_ROLES = ["ADMIN", "PLANNER"] as const;

export async function createSite(user: SessionUser, input: unknown) {
  requireRole(user, [...MANAGE_ROLES]);
  const data = siteInputSchema.parse(input);
  return prisma.site.create({ data });
}

export async function setSiteActive(user: SessionUser, id: string, isActive: boolean) {
  requireRole(user, [...MANAGE_ROLES]);
  return prisma.site.update({ where: { id }, data: { isActive } });
}
