"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSession } from "@/server/auth/session";
import { createClient, setClientActive } from "@/server/clients/actions";

export async function createClientAction(formData: FormData) {
  const user = await requireSession();
  const client = await createClient(user, Object.fromEntries(formData));
  revalidatePath("/clients");
  redirect(`/clients/${client.id}`);
}

export async function setClientActiveAction(id: string, isActive: boolean) {
  const user = await requireSession();
  await setClientActive(user, id, isActive);
  revalidatePath("/clients");
  revalidatePath(`/clients/${id}`);
}
