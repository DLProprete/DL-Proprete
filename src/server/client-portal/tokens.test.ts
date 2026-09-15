import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import {
  createPortalToken,
  consumePortalToken,
  hashToken,
  isTokenExpired,
  PortalTokenInvalidError,
} from "./tokens";

describe("hashToken / isTokenExpired — fonctions pures", () => {
  it("hashToken est déterministe et ne renvoie jamais le token brut", () => {
    const raw = "un-token-de-test";
    expect(hashToken(raw)).toBe(hashToken(raw));
    expect(hashToken(raw)).not.toBe(raw);
  });

  it("isTokenExpired compare strictement à l'instant donné", () => {
    const now = new Date("2026-01-01T12:00:00Z");
    expect(isTokenExpired(new Date("2026-01-01T11:59:59Z"), now)).toBe(true);
    expect(isTokenExpired(new Date("2026-01-01T12:00:01Z"), now)).toBe(false);
  });
});

describe("consumePortalToken — usage unique (intégration DB)", () => {
  const suffix = Date.now();
  let clientId: string;

  beforeAll(async () => {
    const client = await prisma.client.create({
      data: { legalName: `Client Test Portail ${suffix}`, billingAddress: "1 rue Test" },
    });
    clientId = client.id;
  });

  afterAll(async () => {
    await prisma.clientPortalToken.deleteMany({ where: { clientId } });
    await prisma.client.delete({ where: { id: clientId } });
  });

  it("un token valide se consomme une fois et renvoie le bon clientId", async () => {
    const raw = await createPortalToken(clientId);
    const result = await consumePortalToken(raw);
    expect(result).toBe(clientId);
  });

  it("le même token ne peut pas être consommé une seconde fois", async () => {
    const raw = await createPortalToken(clientId);
    await consumePortalToken(raw);
    await expect(consumePortalToken(raw)).rejects.toBeInstanceOf(PortalTokenInvalidError);
  });

  it("un token expiré est refusé", async () => {
    const raw = await createPortalToken(clientId);
    await prisma.clientPortalToken.updateMany({
      where: { clientId },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });
    await expect(consumePortalToken(raw)).rejects.toBeInstanceOf(PortalTokenInvalidError);
  });

  it("un token inconnu est refusé", async () => {
    await expect(consumePortalToken("token-qui-nexiste-pas")).rejects.toBeInstanceOf(
      PortalTokenInvalidError,
    );
  });

  // Preuve de la correction du 15/09 : deux consommations concurrentes du
  // même token (ex. un proxy de messagerie qui pré-charge le lien, puis le
  // vrai clic) ne doivent jamais réussir toutes les deux.
  it("deux consommations concurrentes du même token : une seule réussit", async () => {
    const raw = await createPortalToken(clientId);
    const results = await Promise.allSettled([consumePortalToken(raw), consumePortalToken(raw)]);
    const succeeded = results.filter((r) => r.status === "fulfilled");
    const failed = results.filter((r) => r.status === "rejected");
    expect(succeeded).toHaveLength(1);
    expect(failed).toHaveLength(1);
  });
});
