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

export async function uploadScannedDocumentsAction(formData: FormData) {
  const user = await requireSession();
  const files = formData.getAll("files").filter((f): f is File => f instanceof File);
  await uploadScannedDocuments(user, files);
  revalidatePath("/documents");
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
