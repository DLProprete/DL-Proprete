"use server";

import { ZodError } from "zod";
import { redirect } from "next/navigation";
import { requireSession } from "@/server/auth/session";
import { declareAbsence } from "@/server/absences/actions";
import { saveUpload, InvalidUploadError } from "@/lib/uploads";

export async function declareAbsenceAction(formData: FormData) {
  const user = await requireSession();

  const type = String(formData.get("type") ?? "");
  const file = formData.get("document");

  let documentPath: string | undefined;
  try {
    if (file instanceof File && file.size > 0) {
      documentPath = await saveUpload("absences", file);
    }

    await declareAbsence(user, {
      type,
      startsOn: formData.get("startsOn"),
      endsOn: formData.get("endsOn"),
      comment: formData.get("comment"),
      documentPath,
    });
  } catch (error) {
    if (error instanceof ZodError || error instanceof InvalidUploadError) {
      const message = error instanceof ZodError ? error.issues[0]?.message : error.message;
      redirect(`/absences/new?error=${encodeURIComponent(message ?? "Données invalides.")}`);
    }
    throw error;
  }

  redirect("/absences");
}
