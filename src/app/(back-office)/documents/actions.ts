"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ZodError } from "zod";
import { requireSession } from "@/server/auth/session";
import {
  isScannedDocumentKnown,
  uploadScannedDocument,
  runOcr,
  validateScannedDocument,
  rejectScannedDocument,
} from "@/server/scanned-documents/actions";

export async function isScannedDocumentKnownAction(contentHash: string): Promise<boolean> {
  const user = await requireSession();
  return isScannedDocumentKnown(user, contentHash);
}

// Un fichier par appel (le client boucle, voir DocumentUploadField), avec le
// texte déjà lu par l'OCR du navigateur et l'empreinte du fichier d'origine.
export async function uploadScannedDocumentAction(formData: FormData): Promise<"created" | "duplicate" | "rejected"> {
  const user = await requireSession();
  const file = formData.get("file");
  if (!(file instanceof File)) return "rejected";
  const result = await uploadScannedDocument(user, file, {
    contentHash: String(formData.get("contentHash") ?? ""),
    text: String(formData.get("ocrText") ?? ""),
    pageCount: Number(formData.get("pageCount")) || 1,
  });
  return result.status;
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
      documentType: formData.get("documentType") ?? undefined,
      clientId: formData.get("clientId") ?? undefined,
      clientNameRaw: formData.get("clientNameRaw") ?? undefined,
      signedOn: formData.get("signedOn") ?? undefined,
      contractStartsOn: formData.get("contractStartsOn") ?? undefined,
      contractEndsOn: formData.get("contractEndsOn") ?? undefined,
      tacitRenewal: formData.get("tacitRenewal") ?? undefined,
      noticeDays: formData.get("noticeDays") ?? undefined,
      pricing: formData.get("pricing") ?? undefined,
      siteAddresses: formData.get("siteAddresses") ?? undefined,
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
