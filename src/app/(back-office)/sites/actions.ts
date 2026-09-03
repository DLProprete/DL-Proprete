"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSession } from "@/server/auth/session";
import { createSite, setSiteActive, updateSite } from "@/server/sites/actions";

export async function createSiteAction(formData: FormData) {
  const user = await requireSession();
  const site = await createSite(user, Object.fromEntries(formData));
  revalidatePath("/sites");
  redirect(`/sites/${site.id}`);
}

export async function updateSiteAction(id: string, formData: FormData) {
  const user = await requireSession();
  await updateSite(user, id, Object.fromEntries(formData));
  revalidatePath(`/sites/${id}`);
  redirect(`/sites/${id}?saved=1`);
}

export async function setSiteActiveAction(id: string, isActive: boolean) {
  const user = await requireSession();
  await setSiteActive(user, id, isActive);
  revalidatePath("/sites");
  revalidatePath(`/sites/${id}`);
}
