"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSession } from "@/server/auth/session";
import { updateCompanyProfile } from "@/server/settings/actions";
import { InvalidCurrentPasswordError, updateMyEmail, updateMyPassword } from "@/server/account/actions";

export async function updateCompanyProfileAction(formData: FormData) {
  const user = await requireSession();
  await updateCompanyProfile(user, Object.fromEntries(formData));
  revalidatePath("/settings");
  redirect("/settings");
}

export async function updateMyEmailAction(formData: FormData) {
  const user = await requireSession();
  await updateMyEmail(user, { email: formData.get("email") });
  redirect("/settings?accountSaved=email");
}

export async function updateMyPasswordAction(formData: FormData) {
  const user = await requireSession();
  try {
    await updateMyPassword(user, {
      currentPassword: formData.get("currentPassword"),
      newPassword: formData.get("newPassword"),
    });
  } catch (error) {
    if (error instanceof InvalidCurrentPasswordError) {
      redirect("/settings?accountError=current_password");
    }
    throw error;
  }
  redirect("/settings?accountSaved=password");
}
