"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/server/auth/session";
import { validateTimeEntry, rejectTimeEntry } from "@/server/time/review";

export async function validateTimeEntryAction(id: string) {
  const user = await requireSession();
  await validateTimeEntry(user, id);
  revalidatePath("/time-entries");
}

export async function rejectTimeEntryAction(id: string) {
  const user = await requireSession();
  await rejectTimeEntry(user, id);
  revalidatePath("/time-entries");
}
