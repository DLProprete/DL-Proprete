"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/server/auth/session";
import { approveAbsence, rejectAbsence } from "@/server/absences/actions";

export async function approveAbsenceAction(id: string) {
  const user = await requireSession();
  await approveAbsence(user, id);
  revalidatePath("/absence-review");
  revalidatePath("/planning");
  revalidatePath("/planning/day");
}

export async function rejectAbsenceAction(id: string) {
  const user = await requireSession();
  await rejectAbsence(user, id);
  revalidatePath("/absence-review");
}
