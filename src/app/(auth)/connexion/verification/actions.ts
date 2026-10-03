"use server";

import { redirect } from "next/navigation";
import { pendingTwoFactorSession } from "@/server/auth/session";
import { RateLimitedError } from "@/server/auth/rate-limit";
import { InvalidTwoFactorCodeError, verifyTwoFactorCode } from "@/server/auth/two-factor";

export async function verifyTwoFactorAction(formData: FormData) {
  const pending = await pendingTwoFactorSession();
  if (!pending) redirect("/");
  try {
    await verifyTwoFactorCode({
      userId: pending.userId,
      sessionId: pending.sessionId,
      code: String(formData.get("code") ?? ""),
    });
  } catch (error) {
    if (error instanceof RateLimitedError) redirect("/connexion/verification?error=rate_limit");
    if (error instanceof InvalidTwoFactorCodeError) redirect("/connexion/verification?error=code");
    throw error;
  }
  redirect("/");
}
