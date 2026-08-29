import { prisma } from "@/lib/prisma";
import { requireRole, type SessionUser } from "@/server/auth/session";
import { hasSchedulingConflict } from "./conflicts";

const MANAGE_ROLES = ["ADMIN", "PLANNER"] as const;

export class AssignmentConflictError extends Error {}
export class InvalidAssigneeError extends Error {}

export async function recomputeShiftStatus(shiftId: string) {
  const shift = await prisma.shift.findUniqueOrThrow({ where: { id: shiftId } });
  if (shift.status === "DONE" || shift.status === "CANCELLED") return;

  const activeCount = await prisma.assignment.count({ where: { shiftId, status: "ASSIGNED" } });
  const status =
    activeCount === 0 ? "UNSTAFFED" : activeCount < shift.requiredAgents ? "PARTIALLY_STAFFED" : "PLANNED";

  await prisma.shift.update({ where: { id: shiftId }, data: { status } });
}

export async function assignAgent(user: SessionUser, shiftId: string, agentUserId: string) {
  requireRole(user, [...MANAGE_ROLES]);

  const agent = await prisma.user.findUnique({ where: { id: agentUserId } });
  if (!agent || agent.role !== "AGENT" || !agent.isActive) {
    throw new InvalidAssigneeError("Cet utilisateur n'est pas un agent actif.");
  }

  const shift = await prisma.shift.findUniqueOrThrow({ where: { id: shiftId } });

  const conflict = await hasSchedulingConflict(agentUserId, shift.startAt, shift.endAt);
  if (conflict) {
    throw new AssignmentConflictError("Cet agent a déjà une vacation qui chevauche ce créneau.");
  }

  await prisma.assignment.create({ data: { shiftId, userId: agentUserId, status: "ASSIGNED" } });
  await recomputeShiftStatus(shiftId);
}

export async function cancelAssignment(user: SessionUser, assignmentId: string) {
  requireRole(user, [...MANAGE_ROLES]);
  const assignment = await prisma.assignment.update({
    where: { id: assignmentId },
    data: { status: "CANCELLED" },
  });
  await recomputeShiftStatus(assignment.shiftId);
}
