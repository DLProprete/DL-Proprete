import { createHash } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { ForbiddenError, requireRole, type SessionUser } from "@/server/auth/session";
import { saveUpload, readUpload, InvalidUploadError } from "@/lib/uploads";
import { scannedDocumentReviewSchema } from "@/lib/zod/scanned-document";
import { parseDateOnly } from "@/lib/dates";
import {
  extractDocumentText,
  matchKnownSupplier,
  extractAmountTtc,
  extractDocumentDate,
  extractReference,
} from "./ocr";
import { classifyDocument, suggestContractFields } from "./contract-extract";

const MANAGE_ROLES = ["ADMIN", "PLANNER"] as const;

export class ScannedDocumentNotPendingError extends Error {}

// Un document sensible (RH/santé) n'est jamais listé ni téléchargeable
// par un PLANNER (queries.ts, la route de fichier) — même garde ici, sur
// les écritures : sans elle, un PLANNER connaissant l'ID d'un document
// sensible pouvait le valider/rejeter en direct (trouvé en audit de
// sécurité du 15/09).
function assertCanWrite(user: SessionUser, document: { isSensitive: boolean }) {
  if (document.isSensitive && user.role !== "ADMIN") {
    throw new ForbiddenError("Document sensible réservé à l'administrateur.");
  }
}

// Type de pièce + champs suggérés, à partir du texte OCR (navigateur ou
// serveur). Une facture garde l'extraction historique ; un contrat reçoit
// les suggestions de contract-extract.ts. Rien n'est acté avant relecture.
async function extractionFromText(ocrText: string | null) {
  if (!ocrText) return {};
  const documentType = classifyDocument(ocrText);
  const documentDate = extractDocumentDate(ocrText);
  if (documentType !== "CONTRAT") {
    const supplier = await matchKnownSupplier(ocrText);
    return {
      documentType,
      supplierName: supplier?.name ?? null,
      amountTtc: extractAmountTtc(ocrText),
      documentDate,
      reference: extractReference(ocrText),
    };
  }
  const clients = await prisma.client.findMany({ select: { id: true, legalName: true, tradeName: true } });
  const contract = suggestContractFields(ocrText, clients);
  return { documentType, ...contract, documentDate: contract.signedOn ?? documentDate };
}

const HASH_REGEX = /^[0-9a-f]{64}$/;

// Empreinte calculée par le navigateur sur le fichier d'origine, vérifiée
// avant l'OCR : re-sélectionner un dossier déjà traité ne refait aucun travail.
export async function isScannedDocumentKnown(user: SessionUser, contentHash: string) {
  requireRole(user, [...MANAGE_ROLES]);
  if (!HASH_REGEX.test(contentHash)) return false;
  return (await prisma.scannedDocument.count({ where: { contentHash } })) > 0;
}

type UploadResult =
  | { status: "created"; document: Awaited<ReturnType<typeof prisma.scannedDocument.create>> }
  | { status: "duplicate" | "rejected" };

// Un fichier déjà déposé (même contenu, quel que soit son statut) est
// ignoré — permet de re-sélectionner tout le dossier local à chaque fois.
// `ocr` : texte déjà lu dans le navigateur (src/lib/browser-ocr.ts), avec
// l'empreinte du fichier d'origine (l'archive envoyée est recompressée).
export async function uploadScannedDocument(
  user: SessionUser,
  file: File,
  ocr?: { contentHash: string; text: string; pageCount: number },
): Promise<UploadResult> {
  requireRole(user, [...MANAGE_ROLES]);
  if (!file || file.size === 0) return { status: "rejected" };
  const contentHash = ocr
    ? ocr.contentHash
    : createHash("sha256").update(Buffer.from(await file.arrayBuffer())).digest("hex");
  if (!HASH_REGEX.test(contentHash)) return { status: "rejected" };
  if (await prisma.scannedDocument.findUnique({ where: { contentHash } })) return { status: "duplicate" };

  let filePath: string;
  try {
    filePath = await saveUpload("scanned-documents", file);
  } catch (error) {
    if (error instanceof InvalidUploadError) return { status: "rejected" };
    throw error;
  }
  const ocrText = ocr?.text.trim() || null;
  const document = await prisma.scannedDocument.create({
    data: {
      filePath,
      originalName: file.name,
      contentHash,
      uploadedByUserId: user.id,
      ...(ocr ? { status: "OCR_DONE" as const, ocrText, pageCount: ocr.pageCount, ...(await extractionFromText(ocrText)) } : {}),
    },
  });
  return { status: "created", document };
}

export async function uploadScannedDocuments(user: SessionUser, files: File[]) {
  requireRole(user, [...MANAGE_ROLES]);
  const created = [];
  for (const file of files) {
    const result = await uploadScannedDocument(user, file);
    if (result.status === "created") created.push(result.document);
  }
  return created;
}

// Traite un document PENDING : OCR + reconnaissance/extraction best-effort.
// Appelé un par un depuis le client (jamais une boucle serveur sur tout le
// lot) pour rester sous les limites de temps d'une fonction serverless.
export async function runOcr(user: SessionUser, id: string) {
  requireRole(user, [...MANAGE_ROLES]);
  const document = await prisma.scannedDocument.findUniqueOrThrow({ where: { id } });
  assertCanWrite(user, document);
  if (document.status !== "PENDING") {
    throw new ScannedDocumentNotPendingError("Ce document a déjà été traité.");
  }

  const buffer = await readUpload(document.filePath);
  const ocrText = await extractDocumentText(document.filePath, buffer);

  return prisma.scannedDocument.update({
    where: { id },
    data: { status: "OCR_DONE", ocrText, ...(await extractionFromText(ocrText)) },
  });
}

export async function validateScannedDocument(user: SessionUser, id: string, input: unknown) {
  requireRole(user, [...MANAGE_ROLES]);
  const document = await prisma.scannedDocument.findUniqueOrThrow({ where: { id } });
  assertCanWrite(user, document);
  const data = scannedDocumentReviewSchema.parse(input);

  if (data.rememberSupplier && data.supplierName?.trim()) {
    await prisma.knownSupplier.upsert({
      where: { matchPattern: data.supplierName.trim() },
      update: {},
      create: { name: data.supplierName.trim(), matchPattern: data.supplierName.trim() },
    });
  }

  const isContract = data.documentType === "CONTRAT";
  const clientId = isContract && data.clientId ? data.clientId : null;
  if (clientId) await prisma.client.findUniqueOrThrow({ where: { id: clientId } });
  const contractFields = isContract
    ? {
        clientId,
        clientNameRaw: data.clientNameRaw?.trim() || null,
        signedOn: data.signedOn ? parseDateOnly(data.signedOn) : null,
        contractStartsOn: data.contractStartsOn ? parseDateOnly(data.contractStartsOn) : null,
        contractEndsOn: data.contractEndsOn ? parseDateOnly(data.contractEndsOn) : null,
        tacitRenewal: data.tacitRenewal ? data.tacitRenewal === "true" : null,
        noticeDays: data.noticeDays === "" || data.noticeDays === undefined ? null : data.noticeDays,
        pricing: data.pricing?.trim() || null,
        siteAddresses: data.siteAddresses?.trim() || null,
      }
    : {};

  return prisma.scannedDocument.update({
    where: { id },
    data: {
      status: "VALIDATED",
      documentType: data.documentType,
      ...contractFields,
      supplierName: data.supplierName || null,
      category: data.category || null,
      amountTtc: data.amountTtc === "" || data.amountTtc === undefined ? null : data.amountTtc,
      documentDate: data.documentDate ? parseDateOnly(data.documentDate) : null,
      reference: data.reference || null,
      // Seul un ADMIN peut changer ce statut — le formulaire d'un PLANNER
      // n'a jamais la case à cocher, donc data.isSensitive vaudrait false
      // par défaut et effacerait silencieusement le marquage sensible.
      isSensitive: user.role === "ADMIN" ? data.isSensitive : document.isSensitive,
      validatedByUserId: user.id,
      validatedAt: new Date(),
    },
  });
}

export class ScannedContractLinkError extends Error {}

// Reprise d'un contrat papier en cours : le contrat créé dans l'outil garde
// le lien vers son scan, et le préavis lu sur le scan devient le préavis de
// renouvellement du contrat.
export async function linkScannedContract(user: SessionUser, documentId: string, contractId: string) {
  requireRole(user, [...MANAGE_ROLES]);
  const [document, contract] = await Promise.all([
    prisma.scannedDocument.findUniqueOrThrow({ where: { id: documentId } }),
    prisma.contract.findUniqueOrThrow({ where: { id: contractId } }),
  ]);
  assertCanWrite(user, document);
  if (document.documentType !== "CONTRAT" || document.status !== "VALIDATED") {
    throw new ScannedContractLinkError("Seul un contrat scanné validé peut être repris.");
  }
  if (document.contractId) throw new ScannedContractLinkError("Ce scan est déjà lié à un contrat.");
  if (document.clientId !== contract.clientId) {
    throw new ScannedContractLinkError("Le client du contrat ne correspond pas à celui du scan.");
  }
  await prisma.$transaction([
    prisma.scannedDocument.update({ where: { id: documentId }, data: { contractId } }),
    ...(document.noticeDays !== null
      ? [prisma.contract.update({ where: { id: contractId }, data: { renewalNoticeDays: document.noticeDays } })]
      : []),
  ]);
}

export async function rejectScannedDocument(user: SessionUser, id: string) {
  requireRole(user, [...MANAGE_ROLES]);
  const document = await prisma.scannedDocument.findUniqueOrThrow({ where: { id } });
  assertCanWrite(user, document);
  return prisma.scannedDocument.update({
    where: { id },
    data: { status: "REJECTED", validatedByUserId: user.id, validatedAt: new Date() },
  });
}
