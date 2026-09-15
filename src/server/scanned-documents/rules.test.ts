import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { ForbiddenError, type SessionUser } from "@/server/auth/session";
import {
  uploadScannedDocuments,
  validateScannedDocument,
  rejectScannedDocument,
  runOcr,
} from "./actions";
import { matchKnownSupplier } from "./ocr";

// Boucle d'apprentissage fournisseur (docs/NUMERISATION-DOCUMENTS.md, spike
// du 10/09) : un fournisseur mémorisé à la validation d'un document est
// reconnu automatiquement sur le texte OCR d'un document suivant. runOcr
// lui-même (qui appelle réellement tesseract.js) n'est pas testé ici — la
// justesse de l'OCR se vérifie manuellement (voir plan), ce test couvre
// uniquement la logique métier autour.
describe("boucle d'apprentissage fournisseur et relecture (intégration DB)", () => {
  const suffix = Date.now();
  let adminUser: SessionUser;
  let plannerUser: SessionUser;
  let documentId: string;
  const knownSupplierIds: string[] = [];
  const documentIds: string[] = [];

  beforeAll(async () => {
    const admin = await prisma.user.create({
      data: {
        email: `test-scanned-doc-admin-${suffix}@dlproprete.fr`,
        name: "Admin Test",
        firstName: "Admin",
        lastName: "Test",
        role: "ADMIN",
        emailVerified: true,
      },
    });
    adminUser = { id: admin.id, email: admin.email, role: "ADMIN", isActive: true };
    const planner = await prisma.user.create({
      data: {
        email: `test-scanned-doc-planner-${suffix}@dlproprete.fr`,
        name: "Planner Test",
        firstName: "Planner",
        lastName: "Test",
        role: "PLANNER",
        emailVerified: true,
      },
    });
    plannerUser = { id: planner.id, email: planner.email, role: "PLANNER", isActive: true };

    const document = await prisma.scannedDocument.create({
      data: {
        filePath: `scanned-documents/test-${suffix}.pdf`,
        originalName: `bon-de-commande-${suffix}.pdf`,
        contentHash: `test-hash-${suffix}`,
        status: "OCR_DONE",
        ocrText: `OVHCLOUD SAS\nBon de commande n° ${suffix}\nTotal TTC : 120,00 €`,
        uploadedByUserId: admin.id,
      },
    });
    documentId = document.id;
    documentIds.push(document.id);
  });

  afterAll(async () => {
    await prisma.scannedDocument.deleteMany({ where: { id: { in: documentIds } } });
    await prisma.knownSupplier.deleteMany({ where: { id: { in: knownSupplierIds } } });
    await prisma.user.delete({ where: { id: adminUser.id } });
    await prisma.user.delete({ where: { id: plannerUser.id } });
  });

  it("un fournisseur inconnu n'est reconnu sur aucun texte", async () => {
    const match = await matchKnownSupplier("OVHCLOUD SAS\nTotal TTC : 120,00 €");
    expect(match).toBeNull();
  });

  it("valider un document avec 'mémoriser ce fournisseur' crée le KnownSupplier", async () => {
    const updated = await validateScannedDocument(adminUser, documentId, {
      supplierName: "OVHcloud",
      category: "ACHATS",
      amountTtc: "120",
      rememberSupplier: true,
    });
    expect(updated.status).toBe("VALIDATED");
    expect(updated.validatedByUserId).toBe(adminUser.id);

    const supplier = await prisma.knownSupplier.findUnique({ where: { matchPattern: "OVHcloud" } });
    expect(supplier).not.toBeNull();
    if (supplier) knownSupplierIds.push(supplier.id);
  });

  it("un document suivant du même fournisseur est reconnu automatiquement", async () => {
    const match = await matchKnownSupplier("OVHCLOUD SAS\nBon de commande n° 999\nTotal TTC : 42,00 €");
    expect(match?.name).toBe("OVHcloud");
  });

  it("rejectScannedDocument passe le statut à REJECTED", async () => {
    const document = await prisma.scannedDocument.create({
      data: {
        filePath: `scanned-documents/test-reject-${suffix}.pdf`,
        originalName: `doublon-${suffix}.pdf`,
        contentHash: `test-hash-reject-${suffix}`,
        status: "OCR_DONE",
        uploadedByUserId: adminUser.id,
      },
    });
    documentIds.push(document.id);

    const rejected = await rejectScannedDocument(adminUser, document.id);
    expect(rejected.status).toBe("REJECTED");
  });

  it("uploadScannedDocuments ignore silencieusement un fichier déjà déposé (même contenu)", async () => {
    const content = `contenu unique ${suffix}`;
    const makeFile = () => new File([content], `scan-${suffix}.pdf`, { type: "application/pdf" });

    const firstBatch = await uploadScannedDocuments(adminUser, [makeFile()]);
    expect(firstBatch).toHaveLength(1);
    documentIds.push(firstBatch[0].id);

    const secondBatch = await uploadScannedDocuments(adminUser, [makeFile()]);
    expect(secondBatch).toHaveLength(0); // même contenu -> ignoré, pas de doublon

    const count = await prisma.scannedDocument.count({ where: { contentHash: firstBatch[0].contentHash } });
    expect(count).toBe(1);
  });

  // Un document sensible (RH/santé) n'est jamais accessible en écriture à
  // un PLANNER, même en connaissant son ID (correction du 15/09).
  describe("document marqué sensible — écriture réservée à ADMIN", () => {
    let sensitiveDocId: string;

    beforeAll(async () => {
      const document = await prisma.scannedDocument.create({
        data: {
          filePath: `scanned-documents/test-sensible-${suffix}.pdf`,
          originalName: `sensible-${suffix}.pdf`,
          contentHash: `test-hash-sensible-${suffix}`,
          status: "PENDING",
          isSensitive: true,
          uploadedByUserId: adminUser.id,
        },
      });
      sensitiveDocId = document.id;
      documentIds.push(document.id);
    });

    it("runOcr rejette un PLANNER", async () => {
      await expect(runOcr(plannerUser, sensitiveDocId)).rejects.toBeInstanceOf(ForbiddenError);
    });

    it("validateScannedDocument rejette un PLANNER", async () => {
      await expect(
        validateScannedDocument(plannerUser, sensitiveDocId, { category: "COMPTABLE" }),
      ).rejects.toBeInstanceOf(ForbiddenError);
    });

    it("rejectScannedDocument rejette un PLANNER", async () => {
      await expect(rejectScannedDocument(plannerUser, sensitiveDocId)).rejects.toBeInstanceOf(
        ForbiddenError,
      );
    });

    it("un ADMIN peut toujours valider un document sensible", async () => {
      const updated = await validateScannedDocument(adminUser, sensitiveDocId, {
        category: "COMPTABLE",
        isSensitive: true,
      });
      expect(updated.status).toBe("VALIDATED");
      expect(updated.isSensitive).toBe(true);
    });
  });
});
