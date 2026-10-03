"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { ZodError } from "zod";
import { RateLimitedError } from "@/server/auth/rate-limit";
import { InvalidResetTokenError, requestPasswordReset, resetPasswordWithToken } from "@/server/auth/password-reset";

export async function requestPasswordResetAction(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  if (!email) redirect("/mot-de-passe-oublie");
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  try {
    await requestPasswordReset({ email, ip });
  } catch (error) {
    if (error instanceof RateLimitedError) redirect("/mot-de-passe-oublie?error=rate_limit");
    throw error;
  }
  // Même message que le compte existe ou non.
  redirect("/mot-de-passe-oublie?sent=1");
}

export async function resetPasswordAction(formData: FormData) {
  const token = String(formData.get("token") ?? "");
  try {
    await resetPasswordWithToken({ token, password: formData.get("newPassword") });
  } catch (error) {
    if (error instanceof InvalidResetTokenError) redirect("/mot-de-passe-oublie?error=invalid");
    if (error instanceof ZodError) {
      const message = error.issues[0]?.message ?? "Mot de passe invalide.";
      redirect(`/mot-de-passe-oublie/nouveau?token=${encodeURIComponent(token)}&error=${encodeURIComponent(message)}`);
    }
    throw error;
  }
  redirect("/login?reset=1");
}
