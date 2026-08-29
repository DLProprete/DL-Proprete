import { prisma } from "@/lib/prisma";
import { requireRole, type SessionUser } from "@/server/auth/session";
import { serviceExceptionInputSchema } from "@/lib/zod/service-exception";

const MANAGE_ROLES = ["ADMIN", "PLANNER"] as const;

export async function createServiceException(user: SessionUser, input: unknown) {
  requireRole(user, [...MANAGE_ROLES]);
  const data = serviceExceptionInputSchema.parse(input);
  return prisma.serviceException.create({
    data: {
      serviceTemplateId: data.serviceTemplateId,
      date: data.date,
      type: data.type,
      notes: data.notes || null,
    },
  });
}

export async function listServiceExceptions(user: SessionUser, serviceTemplateId: string) {
  requireRole(user, [...MANAGE_ROLES]);
  return prisma.serviceException.findMany({
    where: { serviceTemplateId },
    orderBy: { date: "asc" },
  });
}
