import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import type { SessionUser } from "@/server/auth/session";
import { validateScannedDocument, rejectScannedDocument } from "./actions";
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

    const document = await prisma.scannedDocument.create({
      data: {
        filePath: `scanned-documents/test-${suffix}.pdf`,
        originalName: `bon-de-commande-${suffix}.pdf`,
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
        status: "OCR_DONE",
        uploadedByUserId: adminUser.id,
      },
    });
    documentIds.push(document.id);

    const rejected = await rejectScannedDocument(adminUser, document.id);
    expect(rejected.status).toBe("REJECTED");
  });
});
