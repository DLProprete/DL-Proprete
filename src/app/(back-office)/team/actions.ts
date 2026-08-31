"use server";

import { ZodError } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSession } from "@/server/auth/session";
import { createAgent, resetAgentPassword, setAgentActive, updateAgentProfile } from "@/server/team/actions";

function profileFields(formData: FormData) {
  return {
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    phone: formData.get("phone"),
    weeklyContractHours: formData.get("weeklyContractHours"),
    homeAddress: formData.get("homeAddress"),
    homeCity: formData.get("homeCity"),
    homePostalCode: formData.get("homePostalCode"),
    homeLat: formData.get("homeLat"),
    homeLng: formData.get("homeLng"),
    hasDrivingLicense: formData.get("hasDrivingLicense"),
    maxEndTime: formData.get("maxEndTime"),
    minStartTime: formData.get("minStartTime"),
    noWorkWeekdays: formData.getAll("noWorkWeekdays"),
    notes: formData.get("notes"),
  };
}

export async function createAgentAction(formData: FormData) {
  const user = await requireSession();
  try {
    await createAgent(user, {
      ...profileFields(formData),
      email: formData.get("email"),
      password: formData.get("password"),
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
