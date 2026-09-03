import { prisma } from "@/lib/prisma";
import { requireRole, type SessionUser } from "@/server/auth/session";
import { siteInputSchema } from "@/lib/zod/site";

const MANAGE_ROLES = ["ADMIN", "PLANNER"] as const;

function emptyToNull<T extends Record<string, unknown>>(data: T) {
  const next = { ...data };
  for (const key of Object.keys(next)) {
    if (next[key] === "") (next as Record<string, unknown>)[key] = undefined;
  }
  return next;
}

export async function createSite(user: SessionUser, input: unknown) {
  requireRole(user, [...MANAGE_ROLES]);
  const data = emptyToNull(siteInputSchema.parse(input));
  return prisma.site.create({ data });
}

export async function updateSite(user: SessionUser, id: string, input: unknown) {
  requireRole(user, [...MANAGE_ROLES]);
  const parsed = emptyToNull(siteInputSchema.parse(input));
  const { clientId: _clientId, ...data } = parsed;
  return prisma.site.update({ where: { id }, data });
}

export async function setSiteActive(user: SessionUser, id: string, isActive: boolean) {
  requireRole(user, [...MANAGE_ROLES]);
  return prisma.site.update({ where: { id }, data: { isActive } });
}

export async function createSiteLog(
  user: SessionUser,
  input: { siteId: string; type: "ANOMALY" | "EQUIPMENT" | "OTHER"; comment: string; photoPath?: string | null },
) {
  requireRole(user, ["ADMIN", "PLANNER", "AGENT"]);
  if (!input.comment.trim()) throw new Error("Un commentaire est requis.");
  return prisma.siteLog.create({
    data: {
      siteId: input.siteId,
      userId: user.id,
      type: input.type,
      comment: input.comment.trim(),
      photoPath: input.photoPath || null,
    },
  });
}
