"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSession } from "@/server/auth/session";
import { updateAlertSettings, updateCompanyProfile } from "@/server/settings/actions";
import { ZodError } from "zod";
import { updateRetentionSettings } from "@/server/retention/settings";
import { runPurge } from "@/server/retention/purge";

export async function updateAlertSettingsAction(formData: FormData) {
  const user = await requireSession();
  try {
    await updateAlertSettings(user, Object.fromEntries(formData));
  } catch (error) {
    if (error instanceof ZodError) {
      redirect(`/settings?alertsError=${encodeURIComponent(error.issues[0]?.message ?? "Valeur invalide.")}#alertes`);
    }
    throw error;
  }
  revalidatePath("/settings");
  redirect("/settings?alertsSaved=1#alertes");
}

export async function updateRetentionAction(formData: FormData) {
  const user = await requireSession();
  try {
    await updateRetentionSettings(user, Object.fromEntries(formData));
  } catch (error) {
    if (error instanceof ZodError) {
      redirect(`/settings?retentionError=${encodeURIComponent(error.issues[0]?.message ?? "Durée invalide.")}#conservation`);
    }
    throw error;
  }
  revalidatePath("/settings");
  redirect("/settings?retentionSaved=1#conservation");
}

export async function runPurgeNowAction() {
  const user = await requireSession();
  await runPurge(new Date(), user);
  revalidatePath("/settings");
  redirect("/settings?purged=1#conservation");
}

export async function updateCompanyProfileAction(formData: FormData) {
  const user = await requireSession();
  await updateCompanyProfile(user, Object.fromEntries(formData));
  revalidatePath("/settings");
  redirect("/settings");
}
