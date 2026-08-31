"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSession } from "@/server/auth/session";
import {
  startTimeEntry,
  endTimeEntry,
  TimeEntryAlreadyOpenError,
  TimeEntryTooShortError,
} from "@/server/time/actions";

export async function startTimeEntryAction(shiftId: string) {
  const user = await requireSession();
  try {
    await startTimeEntry(user, shiftId);
  } catch (error) {
    if (error instanceof TimeEntryAlreadyOpenError) {
      redirect("/today?error=already-open");
    }
    throw error;
  }
  revalidatePath("/today");
  redirect("/today");
}

export async function endTimeEntryAction(timeEntryId: string) {
  const user = await requireSession();
  let entry;
  try {
    entry = await endTimeEntry(user, timeEntryId);
  } catch (error) {
    if (error instanceof TimeEntryTooShortError) {
      redirect("/today?error=too-short");
    }
    throw error;
  }
  revalidatePath("/today");
  redirect(entry.shiftId ? `/today?justEnded=${entry.shiftId}` : "/today");
}
