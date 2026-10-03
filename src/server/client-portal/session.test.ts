import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { createPortalSession, deletePortalSession, revokePortalSessions } from "./session";
import { hashToken } from "./tokens";

describe("sessions du portail client (intégration DB)", () => {
  const suffix = Date.now();
  let clientId: string;

  beforeAll(async () => {
    const client = await prisma.client.create({
      data: { legalName: `Client Test Session Portail ${suffix}`, billingAddress: "1 rue Test" },
    });
    clientId = client.id;
  });

  afterAll(async () => {
    await prisma.clientPortalSession.deleteMany({ where: { clientId } });
    await prisma.client.delete({ where: { id: clientId } });
  });

  it("ne stocke que le hash du jeton remis dans le cookie", async () => {
    const { token } = await createPortalSession(clientId);
    expect(token.length).toBeGreaterThanOrEqual(43); // 32 octets en base64url
    expect(await prisma.clientPortalSession.findUnique({ where: { id: token } })).toBeNull();
    expect(await prisma.clientPortalSession.findUnique({ where: { id: hashToken(token) } })).not.toBeNull();
  });

  it("la déconnexion supprime la session du jeton présenté", async () => {
    const { token } = await createPortalSession(clientId);
    await deletePortalSession(token);
    expect(await prisma.clientPortalSession.findUnique({ where: { id: hashToken(token) } })).toBeNull();
  });

  it("révoque toutes les sessions d'un client", async () => {
    await createPortalSession(clientId);
    await createPortalSession(clientId);
    await revokePortalSessions(clientId);
    expect(await prisma.clientPortalSession.count({ where: { clientId } })).toBe(0);
  });
});
