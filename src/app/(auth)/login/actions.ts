"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { clearLoginAttempts, consumeLoginAttempt, RateLimitedError } from "@/server/auth/rate-limit";

export async function loginAction(formData: FormData) {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const requestHeaders = await headers();
  // Sur Vercel, x-forwarded-for est réécrit par la plateforme (première
  // valeur = IP réelle du client). Derrière un autre proxy, vérifier qu'il
  // écrase l'en-tête reçu, sinon le client choisit sa propre clé.
  const ip = requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";

  try {
    await consumeLoginAttempt({ ip, email });
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

  await clearLoginAttempts(email);
  // ADMIN : la page de vérification demande le code ; pour les autres
  // rôles, elle renvoie aussitôt vers l'accueil.
  redirect("/connexion/verification");
}
