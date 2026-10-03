"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSession } from "@/server/auth/session";
import { updateDisplayPrefs } from "@/server/account/display";

export async function updateDisplayPrefsAction(formData: FormData) {
  const user = await requireSession();
  await updateDisplayPrefs(user, Object.fromEntries(formData));
  // Le layout racine porte les attributs : tout l'arbre est à recalculer.
  revalidatePath("/", "layout");
  redirect("/display?saved=1");
}
