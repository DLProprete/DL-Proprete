import { prisma } from "@/lib/prisma";
import { requireRole, type SessionUser } from "@/server/auth/session";
import { checkInSchema } from "@/lib/zod/checkin";
import { parseDateOnly } from "@/lib/dates";

const MANAGE_ROLES = ["ADMIN", "PLANNER"] as const;

export async function createCheckIn(user: SessionUser, siteId: string, input: unknown) {
  requireRole(user, [...MANAGE_ROLES]);
  const data = checkInSchema.parse(input);

  const agent = await prisma.user.findUnique({ where: { id: data.userId }, select: { role: true } });
  if (!agent || agent.role !== "AGENT") {
    throw new Error("L'agent sélectionné est introuvable ou n'est pas un agent de terrain.");
  }

  return prisma.agentSiteCheckIn.create({
    data: {
      userId: data.userId,
      siteId,
      authorId: user.id,
      occurredOn: parseDateOnly(data.occurredOn),
      note: data.note.trim(),
    },
  });
}
