"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSessionRaw, requireSession } from "@/server/auth/session";
import { updateAlertSettings, updateCompanyProfile } from "@/server/settings/actions";
import { InvalidCurrentPasswordError, updateMyEmail, updateMyPassword } from "@/server/account/actions";
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

export async function updateMyEmailAction(formData: FormData) {
  const user = await requireSession();
  const current = await getSessionRaw();
  try {
    await updateMyEmail(
      user,
      { email: formData.get("email"), currentPassword: formData.get("currentPassword") },
      current?.session.id,
    );
  } catch (error) {
    if (error instanceof InvalidCurrentPasswordError) {
      redirect("/settings?accountError=current_password");
    }
    throw error;
  }
  redirect("/settings?accountSaved=email");
}

export async function updateMyPasswordAction(formData: FormData) {
  const user = await requireSession();
  const current = await getSessionRaw();
  try {
    await updateMyPassword(
      user,
      {
        currentPassword: formData.get("currentPassword"),
        newPassword: formData.get("newPassword"),
      },
      current?.session.id,
    );
  } catch (error) {
    if (error instanceof InvalidCurrentPasswordError) {
      redirect("/settings?accountError=current_password");
    }
    throw error;
  }
  redirect("/settings?accountSaved=password");
}
