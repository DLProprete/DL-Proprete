"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ZodError } from "zod";
import { requireSession } from "@/server/auth/session";
import { createSite, setSiteActive, setSiteLogVisibility, updateSite } from "@/server/sites/actions";
import { createCheckIn } from "@/server/checkins/actions";

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

export async function setSiteLogVisibilityAction(
  siteId: string,
  logId: string,
  visibleToClient: boolean,
) {
  const user = await requireSession();
  await setSiteLogVisibility(user, logId, visibleToClient);
  revalidatePath(`/sites/${siteId}`);
}

export async function createCheckInAction(siteId: string, formData: FormData) {
  const user = await requireSession();
  try {
    await createCheckIn(user, siteId, Object.fromEntries(formData));
  } catch (error) {
    if (error instanceof ZodError) {
      const message = error.issues[0]?.message ?? "Données invalides.";
      redirect(`/sites/${siteId}?checkInError=${encodeURIComponent(message)}`);
    }
    throw error;
  }
  revalidatePath(`/sites/${siteId}`);
  redirect(`/sites/${siteId}?checkInSaved=1`);
}
