"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSession } from "@/server/auth/session";
import {
  createProspect,
  updateProspect,
  convertProspectToClient,
  ProspectAlreadyConvertedError,
} from "@/server/prospects/actions";

export async function createProspectAction(formData: FormData) {
  const user = await requireSession();
  const prospect = await createProspect(user, Object.fromEntries(formData));
  revalidatePath("/prospects");
  redirect(`/prospects/${prospect.id}`);
}

export async function updateProspectAction(id: string, formData: FormData) {
  const user = await requireSession();
  await updateProspect(user, id, Object.fromEntries(formData));
  revalidatePath("/prospects");
  revalidatePath(`/prospects/${id}`);
  redirect(`/prospects/${id}`);
}

export async function convertProspectToClientAction(prospectId: string, formData: FormData) {
  const user = await requireSession();
  let client: { id: string };
  try {
    client = await convertProspectToClient(user, prospectId, Object.fromEntries(formData));
  } catch (error) {
    if (error instanceof ProspectAlreadyConvertedError) {
      const params = new URLSearchParams({ error: "already-converted" });
      redirect(`/prospects/${prospectId}?${params.toString()}`);
    }
    throw error;
  }
  revalidatePath("/prospects");
  revalidatePath(`/prospects/${prospectId}`);
  revalidatePath("/clients");
  redirect(`/clients/${client.id}`);
}
