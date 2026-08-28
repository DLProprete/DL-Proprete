"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSession } from "@/server/auth/session";
import { generateShifts } from "@/server/planning/generate-shifts";
import {
  assignAgent,
  cancelAssignment,
  AssignmentConflictError,
  InvalidAssigneeError,
} from "@/server/planning/assignments";

function withConflictError(returnTo: string): string {
  const separator = returnTo.includes("?") ? "&" : "?";
  return `${returnTo}${separator}error=conflict`;
}

export async function generateShiftsAction(returnTo: string) {
  const user = await requireSession();
  await generateShifts(user);
  revalidatePath("/planning");
  revalidatePath("/planning/day");
  redirect(returnTo);
}

export async function assignAgentAction(shiftId: string, returnTo: string, formData: FormData) {
  const user = await requireSession();
  const agentUserId = String(formData.get("agentUserId") ?? "");

  try {
    await assignAgent(user, shiftId, agentUserId);
  } catch (error) {
    if (error instanceof AssignmentConflictError || error instanceof InvalidAssigneeError) {
      redirect(withConflictError(returnTo));
    }
    throw error;
  }

  revalidatePath("/planning");
  revalidatePath("/planning/day");
  redirect(returnTo);
}

export async function cancelAssignmentAction(assignmentId: string, returnTo: string) {
  const user = await requireSession();
  await cancelAssignment(user, assignmentId);
  revalidatePath("/planning");
  revalidatePath("/planning/day");
  redirect(returnTo);
}
