import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { ForbiddenError, type SessionUser } from "@/server/auth/session";
import { exportScannedDocumentsCsv } from "./scanned-documents-csv";

const planner: SessionUser = {
  id: "u-planner",
  email: "planner@dlproprete.fr",
  role: "PLANNER",
  isActive: true,
};

describe("droits export CSV documents numérisés — ADMIN seulement", () => {
  it("rejette un PLANNER", async () => {
    await expect(exportScannedDocumentsCsv(planner)).rejects.toBeInstanceOf(ForbiddenError);
  });
});

describe("export CSV des documents validés (intégration DB)", () => {
  const suffix = Date.now();
  let adminUser: SessionUser;
  const documentIds: string[] = [];

  beforeAll(async () => {
    const admin = await prisma.user.create({
      data: {
        email: `test-export-docs-admin-${suffix}@dlproprete.fr`,
        name: "Admin Export Docs",
        firstName: "Admin",
        lastName: "ExportDocs",
        role: "ADMIN",
        emailVerified: true,
      },
    });
    adminUser = { id: admin.id, email: admin.email, role: "ADMIN", isActive: true };

    const validated = await prisma.scannedDocument.create({
      data: {
        filePath: "scanned-documents/valide.pdf",
        originalName: `valide-${suffix}.pdf`,
        status: "VALIDATED",
        category: "ACHATS",
        supplierName: "OVHcloud",
        amountTtc: 120,
        documentDate: new Date("2024-03-15"),
        uploadedByUserId: admin.id,
        validatedByUserId: admin.id,
        validatedAt: new Date(),
      },
    });
    // Sensible -> ne doit jamais apparaître dans l'export.
    const sensible = await prisma.scannedDocument.create({
      data: {
        filePath: "scanned-documents/sensible.pdf",
        originalName: `sensible-${suffix}.pdf`,
        status: "VALIDATED",
        category: "ACHATS",
        isSensitive: true,
        uploadedByUserId: admin.id,
        validatedByUserId: admin.id,
        validatedAt: new Date(),
      },
    });
    // Pas encore validé -> ne doit pas apparaître.
    const pending = await prisma.scannedDocument.create({
      data: {
        filePath: "scanned-documents/pending.pdf",
        originalName: `pending-${suffix}.pdf`,
        status: "OCR_DONE",
        category: "ACHATS",
        uploadedByUserId: admin.id,
      },
    });
    documentIds.push(validated.id, sensible.id, pending.id);
  });

  afterAll(async () => {
    await prisma.scannedDocument.deleteMany({ where: { id: { in: documentIds } } });
    await prisma.user.delete({ where: { id: adminUser.id } });
  });

  it("n'inclut que les documents VALIDATED et non sensibles", async () => {
    const csv = await exportScannedDocumentsCsv(adminUser);
    const lines = csv.split("\r\n");
    expect(lines[0]).toBe("﻿Date;Catégorie;Fournisseur;Référence;Montant TTC;Fichier");
    expect(lines).toHaveLength(2); // en-tête + le seul document validé non sensible
    expect(lines[1]).toContain("OVHcloud");
    expect(lines[1]).toContain("120,00");
  });

  it("filtre par catégorie", async () => {
    const csv = await exportScannedDocumentsCsv(adminUser, "STOCK");
    const lines = csv.split("\r\n");
    expect(lines).toHaveLength(1); // en-tête seulement, aucun document STOCK
  });
});
