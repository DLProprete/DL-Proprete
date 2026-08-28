import { prisma } from "@/lib/prisma";
import { requireRole, type SessionUser } from "@/server/auth/session";
import { serviceTemplateInputSchema } from "@/lib/zod/service-template";
import { timeStringToDate } from "@/lib/dates";

const MANAGE_ROLES = ["ADMIN", "PLANNER"] as const;

export async function createServiceTemplate(user: SessionUser, input: unknown) {
  requireRole(user, [...MANAGE_ROLES]);
  const data = serviceTemplateInputSchema.parse(input);
  return prisma.serviceTemplate.create({
    data: {
      contractId: data.contractId,
      name: data.name,
      daysOfWeek: data.daysOfWeek,
      startTime: timeStringToDate(data.startTime),
      endTime: timeStringToDate(data.endTime),
      durationMinutes: data.durationMinutes,
      requiredAgents: data.requiredAgents,
      instructions: data.instructions,
    },
  });
}

export async function setServiceTemplateActive(user: SessionUser, id: string, isActive: boolean) {
  requireRole(user, [...MANAGE_ROLES]);
  return prisma.serviceTemplate.update({ where: { id }, data: { isActive } });
}
