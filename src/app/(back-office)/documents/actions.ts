"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ZodError } from "zod";
import { requireSession } from "@/server/auth/session";
import {
  uploadScannedDocuments,
  runOcr,
  validateScannedDocument,
  rejectScannedDocument,
} from "@/server/scanned-documents/actions";

// Un fichier par appel (le client boucle, voir DocumentUploadField) :
// "skipped" = déjà déposé (même empreinte) ou refusé par saveUpload.
export async function uploadScannedDocumentAction(formData: FormData): Promise<"created" | "skipped"> {
  const user = await requireSession();
  const file = formData.get("file");
  if (!(file instanceof File)) return "skipped";
  const created = await uploadScannedDocuments(user, [file]);
  return created.length > 0 ? "created" : "skipped";
}

export async function runOcrAction(id: string) {
  const user = await requireSession();
  await runOcr(user, id);
  revalidatePath("/documents");
}

export async function validateScannedDocumentAction(id: string, formData: FormData) {
  const user = await requireSession();
  try {
    await validateScannedDocument(user, id, {
      supplierName: formData.get("supplierName"),
      category: formData.get("category"),
      amountTtc: formData.get("amountTtc"),
      documentDate: formData.get("documentDate"),
      reference: formData.get("reference"),
      isSensitive: formData.get("isSensitive"),
      rememberSupplier: formData.get("rememberSupplier"),
    });
  } catch (error) {
    if (error instanceof ZodError) {
      const message = error.issues[0]?.message ?? "Données invalides.";
      redirect(`/documents/${id}?error=${encodeURIComponent(message)}`);
    }
    throw error;
  }
  revalidatePath("/documents");
  redirect("/documents");
}

export async function rejectScannedDocumentAction(id: string) {
  const user = await requireSession();
  await rejectScannedDocument(user, id);
  revalidatePath("/documents");
  redirect("/documents");
}
