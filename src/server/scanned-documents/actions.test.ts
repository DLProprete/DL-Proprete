import { describe, expect, it } from "vitest";
import { ForbiddenError, type SessionUser } from "@/server/auth/session";
import { scannedDocumentReviewSchema } from "@/lib/zod/scanned-document";
import { uploadScannedDocuments, runOcr, validateScannedDocument, rejectScannedDocument } from "./actions";
import { listScannedDocuments, getScannedDocument } from "./queries";

const agent: SessionUser = { id: "u-agent", email: "agent@dlproprete.fr", role: "AGENT", isActive: true };

describe("droits ScannedDocument — ADMIN/PLANNER uniquement, jamais AGENT", () => {
  it("uploadScannedDocuments rejette un AGENT", async () => {
    await expect(uploadScannedDocuments(agent, [])).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("runOcr rejette un AGENT", async () => {
    await expect(runOcr(agent, "any-id")).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("validateScannedDocument rejette un AGENT", async () => {
    await expect(validateScannedDocument(agent, "any-id", {})).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("rejectScannedDocument rejette un AGENT", async () => {
    await expect(rejectScannedDocument(agent, "any-id")).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("listScannedDocuments rejette un AGENT", async () => {
    await expect(listScannedDocuments(agent)).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("getScannedDocument rejette un AGENT", async () => {
    await expect(getScannedDocument(agent, "any-id")).rejects.toBeInstanceOf(ForbiddenError);
  });
});

describe("validation de la relecture — champs optionnels, jamais de valeur forcée", () => {
  it("accepte un formulaire vide (tout à compléter à la main)", () => {
    expect(() => scannedDocumentReviewSchema.parse({})).not.toThrow();
  });

  it("accepte une catégorie valide", () => {
    const parsed = scannedDocumentReviewSchema.parse({ category: "COMPTABLE" });
    expect(parsed.category).toBe("COMPTABLE");
  });

  it("refuse une catégorie inconnue", () => {
    expect(() => scannedDocumentReviewSchema.parse({ category: "AUTRE" })).toThrow();
  });

  it("refuse un montant négatif", () => {
    expect(() => scannedDocumentReviewSchema.parse({ amountTtc: "-5" })).toThrow();
  });
});
