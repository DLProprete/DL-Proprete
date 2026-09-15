import { prisma } from "@/lib/prisma";
import { requireRole, type SessionUser } from "@/server/auth/session";
import { saveUpload, readUpload, InvalidUploadError } from "@/lib/uploads";
import { scannedDocumentReviewSchema } from "@/lib/zod/scanned-document";
import { parseDateOnly } from "@/lib/dates";
import {
  extractDocumentText,
  matchKnownSupplier,
  extractAmountTtc,
  extractDocumentDate,
} from "./ocr";

const MANAGE_ROLES = ["ADMIN", "PLANNER"] as const;

export class ScannedDocumentNotPendingError extends Error {}

export async function uploadScannedDocuments(user: SessionUser, files: File[]) {
  requireRole(user, [...MANAGE_ROLES]);
  const created = [];
  for (const file of files) {
    if (!file || file.size === 0) continue;
    let filePath: string;
    try {
      filePath = await saveUpload("scanned-documents", file);
    } catch (error) {
      if (error instanceof InvalidUploadError) continue; // fichier ignoré, pas de blocage du reste du dépôt
      throw error;
    }
    const document = await prisma.scannedDocument.create({
      data: {
        filePath,
        originalName: file.name,
        uploadedByUserId: user.id,
      },
    });
    created.push(document);
  }
  return created;
}

// Traite un document PENDING : OCR + reconnaissance/extraction best-effort.
// Appelé un par un depuis le client (jamais une boucle serveur sur tout le
// lot) pour rester sous les limites de temps d'une fonction serverless.
export async function runOcr(user: SessionUser, id: string) {
  requireRole(user, [...MANAGE_ROLES]);
  const document = await prisma.scannedDocument.findUniqueOrThrow({ where: { id } });
  if (document.status !== "PENDING") {
    throw new ScannedDocumentNotPendingError("Ce document a déjà été traité.");
  }

  const buffer = await readUpload(document.filePath);
  const ocrText = await extractDocumentText(document.filePath, buffer);

  const supplier = ocrText ? await matchKnownSupplier(ocrText) : null;
  const amountTtc = ocrText ? extractAmountTtc(ocrText) : null;
  const documentDate = ocrText ? extractDocumentDate(ocrText) : null;

  return prisma.scannedDocument.update({
    where: { id },
    data: {
      status: "OCR_DONE",
      ocrText,
      supplierName: supplier?.name ?? null,
      amountTtc,
      documentDate,
    },
  });
}

export async function validateScannedDocument(user: SessionUser, id: string, input: unknown) {
  requireRole(user, [...MANAGE_ROLES]);
  const data = scannedDocumentReviewSchema.parse(input);

  if (data.rememberSupplier && data.supplierName?.trim()) {
    await prisma.knownSupplier.upsert({
      where: { matchPattern: data.supplierName.trim() },
      update: {},
      create: { name: data.supplierName.trim(), matchPattern: data.supplierName.trim() },
    });
  }

  return prisma.scannedDocument.update({
    where: { id },
    data: {
      status: "VALIDATED",
      supplierName: data.supplierName || null,
      category: data.category || null,
      amountTtc: data.amountTtc === "" || data.amountTtc === undefined ? null : data.amountTtc,
      documentDate: data.documentDate ? parseDateOnly(data.documentDate) : null,
      reference: data.reference || null,
      isSensitive: data.isSensitive,
      validatedByUserId: user.id,
      validatedAt: new Date(),
    },
  });
}

export async function rejectScannedDocument(user: SessionUser, id: string) {
  requireRole(user, [...MANAGE_ROLES]);
  return prisma.scannedDocument.update({
    where: { id },
    data: { status: "REJECTED", validatedByUserId: user.id, validatedAt: new Date() },
  });
}
