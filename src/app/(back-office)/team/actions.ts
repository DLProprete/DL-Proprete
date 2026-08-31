"use server";

import { ZodError } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSession } from "@/server/auth/session";
import { createAgent, resetAgentPassword, setAgentActive, updateAgentProfile } from "@/server/team/actions";

// AgentProfileFields masque tout le bloc "terrain" (adresse/GPS/permis/
// horaires/jours non travaillés) pour un PLANNER (Mo6) : ces <input>
// n'existent alors pas dans le DOM, et FormData.get() renvoie null (pas
// undefined) pour un champ absent — le schéma zod, lui, attend "" (comme
// un champ présent mais vide), jamais null. Normalisé ici, au seul endroit
// où le FormData est lu.
function field(formData: FormData, name: string): string {
  return (formData.get(name) as string | null) ?? "";
}

function profileFields(formData: FormData) {
  return {
    firstName: field(formData, "firstName"),
    lastName: field(formData, "lastName"),
    phone: field(formData, "phone"),
    weeklyContractHours: field(formData, "weeklyContractHours"),
    paidLeaveBalance: field(formData, "paidLeaveBalance"),
    homeAddress: field(formData, "homeAddress"),
    homeCity: field(formData, "homeCity"),
    homePostalCode: field(formData, "homePostalCode"),
    homeLat: field(formData, "homeLat"),
    homeLng: field(formData, "homeLng"),
    hasDrivingLicense: field(formData, "hasDrivingLicense"),
    maxEndTime: field(formData, "maxEndTime"),
    minStartTime: field(formData, "minStartTime"),
    noWorkWeekdays: formData.getAll("noWorkWeekdays"),
    notes: field(formData, "notes"),
  };
}

export async function createAgentAction(formData: FormData) {
  const user = await requireSession();
  try {
    await createAgent(user, {
      ...profileFields(formData),
      email: formData.get("email"),
      password: formData.get("password"),
      role: formData.get("role"),
    });
  } catch (error) {
    if (error instanceof ZodError) {
      const message = error.issues[0]?.message ?? "Données invalides.";
      redirect(`/team/new?error=${encodeURIComponent(message)}`);
    }
    throw error;
  }
  revalidatePath("/team");
  redirect("/team");
}

export async function updateAgentProfileAction(agentId: string, formData: FormData) {
  const user = await requireSession();
  try {
    await updateAgentProfile(user, agentId, profileFields(formData));
  } catch (error) {
    if (error instanceof ZodError) {
      const message = error.issues[0]?.message ?? "Données invalides.";
      redirect(`/team/${agentId}?error=${encodeURIComponent(message)}`);
    }
    throw error;
  }
  revalidatePath("/team");
  revalidatePath(`/team/${agentId}`);
  redirect(`/team/${agentId}`);
}

export async function setAgentActiveAction(id: string, isActive: boolean) {
  const user = await requireSession();
  await setAgentActive(user, id, isActive);
  revalidatePath("/team");
  revalidatePath(`/team/${id}`);
}

export async function resetAgentPasswordAction(id: string, formData: FormData) {
  const user = await requireSession();
  await resetAgentPassword(user, id, { password: formData.get("password") });
  revalidatePath(`/team/${id}`);
  redirect(`/team/${id}`);
}
