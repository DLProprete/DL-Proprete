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
  AgentConstraintViolationError,
} from "@/server/planning/assignments";
import { importHolidays } from "@/server/holidays/actions";

function withParam(returnTo: string, key: string, value: string): string {
  const separator = returnTo.includes("?") ? "&" : "?";
  return `${returnTo}${separator}${key}=${encodeURIComponent(value)}`;
}

function withError(returnTo: string, error: string): string {
  return withParam(returnTo, "error", error);
}

// generateShifts est idempotent (occurrences déjà générées ignorées) : sans
// retour visible, un deuxième clic qui ne crée rien de nouveau ressemble à
// un bouton cassé plutôt qu'à un succès silencieux.
export async function generateShiftsAction(returnTo: string) {
  const user = await requireSession();
  const { created } = await generateShifts(user);
  revalidatePath("/planning");
  revalidatePath("/planning/day");
  redirect(withParam(returnTo, "generated", String(created)));
}

export async function assignAgentAction(shiftId: string, returnTo: string, formData: FormData) {
  const user = await requireSession();
  const agentUserId = String(formData.get("agentUserId") ?? "");

  try {
    await assignAgent(user, shiftId, agentUserId);
  } catch (error) {
    if (error instanceof AssignmentConflictError || error instanceof InvalidAssigneeError) {
      redirect(withError(returnTo, "conflict"));
    }
    if (error instanceof AgentConstraintViolationError) {
      redirect(withError(returnTo, error.message));
    }
    throw error;
  }

  revalidatePath("/planning");
  revalidatePath("/planning/day");
  // Le tableau de bord affecte aussi, directement depuis sa liste du jour.
  revalidatePath("/dashboard");
  redirect(returnTo);
}

const ASSIGN_KEY_PREFIX = "assign:";

// Valide un lot de propositions issues de /planning/generate. Chaque ligne
// route par assignAgent (aucune logique dupliquée) : la vérification finale
// se fait à cet instant précis, pas au moment où le brouillon a été calculé
// — une absence approuvée ou un agent affecté ailleurs entre-temps fait
// juste échouer cette ligne, sans bloquer les autres.
export async function confirmDraftAssignmentsAction(formData: FormData) {
  const user = await requireSession();
  let confirmed = 0;
  let failed = 0;

  for (const [key, value] of formData.entries()) {
    if (!key.startsWith(ASSIGN_KEY_PREFIX)) continue;
    const agentUserId = String(value);
    if (!agentUserId) continue; // "Ne pas affecter"
    const shiftId = key.slice(ASSIGN_KEY_PREFIX.length).split(":")[0];

    try {
      await assignAgent(user, shiftId, agentUserId);
      confirmed++;
    } catch (error) {
      if (
        error instanceof AssignmentConflictError ||
        error instanceof InvalidAssigneeError ||
        error instanceof AgentConstraintViolationError
      ) {
        failed++;
        continue;
      }
      throw error;
    }
  }

  revalidatePath("/planning");
  revalidatePath("/planning/day");
  revalidatePath("/dashboard");
  redirect(`/planning?confirmed=${confirmed}&failed=${failed}`);
}

export async function cancelAssignmentAction(assignmentId: string, returnTo: string) {
  const user = await requireSession();
  await cancelAssignment(user, assignmentId);
  revalidatePath("/planning");
  revalidatePath("/planning/day");
  redirect(returnTo);
}

export async function importHolidaysAction(returnTo: string, formData: FormData) {
  const user = await requireSession();
  const year = Number(formData.get("year"));
  await importHolidays(user, year);
  revalidatePath("/planning");
  redirect(returnTo);
}
