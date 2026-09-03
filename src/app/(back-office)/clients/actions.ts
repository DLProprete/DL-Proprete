"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSession } from "@/server/auth/session";
import { createClient, updateClient, setClientActive } from "@/server/clients/actions";
import { sendPortalLink, ClientEmailMissingError } from "@/server/client-portal/actions";

export async function createClientAction(formData: FormData) {
  const user = await requireSession();
  const client = await createClient(user, Object.fromEntries(formData));
  revalidatePath("/clients");
  redirect(`/clients/${client.id}`);
}

export async function updateClientAction(id: string, formData: FormData) {
  const user = await requireSession();
  await updateClient(user, id, Object.fromEntries(formData));
  revalidatePath("/clients");
  revalidatePath(`/clients/${id}`);
  redirect(`/clients/${id}?updated=1`);
}

export async function setClientActiveAction(id: string, isActive: boolean) {
  const user = await requireSession();
  await setClientActive(user, id, isActive);
  revalidatePath("/clients");
  revalidatePath(`/clients/${id}`);
}

export async function sendPortalLinkAction(clientId: string) {
  const user = await requireSession();
  try {
    await sendPortalLink(user, clientId);
  } catch (error) {
    if (error instanceof ClientEmailMissingError) {
      redirect(`/clients/${clientId}?portalError=no-email`);
    }
    throw error;
  }
  redirect(`/clients/${clientId}?portalSent=1`);
}
