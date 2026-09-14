"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSession } from "@/server/auth/session";
import { completeTimeEntry, TimeEntryAlreadyExistsError } from "@/server/time/actions";
import { createSiteLog } from "@/server/sites/actions";
import { saveUpload, InvalidUploadError } from "@/lib/uploads";

export async function completeTimeEntryAction(shiftId: string, note: string) {
  const user = await requireSession();
  let entry;
  try {
    entry = await completeTimeEntry(user, shiftId, note);
  } catch (error) {
    if (error instanceof TimeEntryAlreadyExistsError) redirect("/today?error=already-done");
    throw error;
  }
  revalidatePath("/today");
  redirect(`/today?justEnded=${entry.shiftId}`);
}

export async function createSiteLogAction(formData: FormData) {
  const user = await requireSession();
  const siteId = String(formData.get("siteId") ?? "");
  const comment = String(formData.get("comment") ?? "");
  const type = String(formData.get("type") ?? "ANOMALY") as "ANOMALY" | "EQUIPMENT" | "OTHER";
  if (!siteId || !comment.trim()) redirect("/today?error=log");

  let photoPath: string | null = null;
  const photo = formData.get("photo");
  if (photo instanceof File && photo.size > 0) {
    try {
      photoPath = await saveUpload("site-logs", photo);
    } catch (error) {
      if (error instanceof InvalidUploadError) {
        redirect(`/today?error=${encodeURIComponent(error.message)}`);
      }
      throw error;
    }
  }

  await createSiteLog(user, { siteId, type, comment, photoPath });
  revalidatePath("/today");
  redirect("/today?logged=1");
}
