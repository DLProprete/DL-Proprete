"use server";

import { redirect } from "next/navigation";
import { ZodError } from "zod";
import { getSessionRaw, requireSession } from "@/server/auth/session";
import { InvalidCurrentPasswordError, updateMyEmail, updateMyPassword } from "@/server/account/actions";

function errorTarget(error: unknown): string | null {
  if (error instanceof InvalidCurrentPasswordError) return "/compte?error=current_password";
  if (error instanceof ZodError) {
    return `/compte?error=${encodeURIComponent(error.issues[0]?.message ?? "Valeur invalide.")}`;
  }
  return null;
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
    const target = errorTarget(error);
    if (target) redirect(target);
    throw error;
  }
  redirect("/compte?saved=email");
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
    const target = errorTarget(error);
    if (target) redirect(target);
    throw error;
  }
  redirect("/compte?saved=password");
}
