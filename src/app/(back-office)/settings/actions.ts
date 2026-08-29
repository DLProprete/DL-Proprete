"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSession } from "@/server/auth/session";
import { updateCompanyProfile } from "@/server/settings/actions";

export async function updateCompanyProfileAction(formData: FormData) {
  const user = await requireSession();
  await updateCompanyProfile(user, Object.fromEntries(formData));
  revalidatePath("/settings");
  redirect("/settings");
}
