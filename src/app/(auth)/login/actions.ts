"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { consumeLoginAttempt, RateLimitedError } from "@/server/auth/rate-limit";

export async function loginAction(formData: FormData) {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const requestHeaders = await headers();
  const ip = requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";

  try {
    consumeLoginAttempt(ip);
  } catch (error) {
    if (error instanceof RateLimitedError) {
      redirect("/login?error=rate_limit");
    }
    throw error;
  }

  try {
    await auth.api.signInEmail({ body: { email, password }, headers: requestHeaders });
  } catch {
    redirect("/login?error=1");
  }

  redirect("/");
}
