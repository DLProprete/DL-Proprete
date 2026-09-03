import { prisma } from "@/lib/prisma";
import { requireRole, type SessionUser } from "@/server/auth/session";
import { clientInputSchema } from "@/lib/zod/client";

const MANAGE_ROLES = ["ADMIN", "PLANNER"] as const;

export async function createClient(user: SessionUser, input: unknown) {
  requireRole(user, [...MANAGE_ROLES]);
  const data = clientInputSchema.parse(input);
  return prisma.client.create({
    data: { ...data, email: data.email || null },
  });
}

export async function updateClient(user: SessionUser, id: string, input: unknown) {
  requireRole(user, [...MANAGE_ROLES]);
  const data = clientInputSchema.parse(input);
  return prisma.client.update({
    where: { id },
    data: {
      ...data,
      email: data.email || null,
      tradeName: data.tradeName || null,
      siret: data.siret || null,
      vatNumber: data.vatNumber || null,
      phone: data.phone || null,
      notes: data.notes || null,
    },
  });
}

export async function setClientActive(user: SessionUser, id: string, isActive: boolean) {
  requireRole(user, [...MANAGE_ROLES]);
  return prisma.client.update({ where: { id }, data: { isActive } });
}
