import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { listMySiteReports } from "./queries";

// Un client ne doit jamais voir les rapports d'un autre client, ni une
// entrée masquée par un ADMIN/PLANNER (visibleToClient: false) — même
// esprit que src/server/sites/access.test.ts pour l'accès agent.
describe("listMySiteReports — cloisonnement par client (intégration DB)", () => {
  const suffix = Date.now();
  let clientAId: string;
  let clientBId: string;
  let siteAId: string;
  let siteBId: string;
  let userId: string;
  let visibleLogId: string;
  let hiddenLogId: string;
  let otherClientLogId: string;

  beforeAll(async () => {
    const [clientA, clientB] = await Promise.all([
      prisma.client.create({
        data: { legalName: `Client A ${suffix}`, billingAddress: "1 rue A" },
      }),
      prisma.client.create({
        data: { legalName: `Client B ${suffix}`, billingAddress: "1 rue B" },
      }),
    ]);
    const [siteA, siteB] = await Promise.all([
      prisma.site.create({
        data: { clientId: clientA.id, name: "Site A", address: "1 rue A", city: "Caen", postalCode: "14000" },
      }),
      prisma.site.create({
        data: { clientId: clientB.id, name: "Site B", address: "1 rue B", city: "Caen", postalCode: "14000" },
      }),
    ]);
    const user = await prisma.user.create({
      data: {
        email: `test-reports-agent-${suffix}@dlproprete.fr`,
        name: "Agent Rapports",
        firstName: "Agent",
        lastName: "Rapports",
        role: "AGENT",
        emailVerified: true,
      },
    });

    clientAId = clientA.id;
    clientBId = clientB.id;
    siteAId = siteA.id;
    siteBId = siteB.id;
    userId = user.id;

    const [visible, hidden, otherClient] = await Promise.all([
      prisma.siteLog.create({
        data: { siteId: siteAId, userId, type: "OTHER", comment: "Visible", visibleToClient: true },
      }),
      prisma.siteLog.create({
        data: { siteId: siteAId, userId, type: "OTHER", comment: "Masqué", visibleToClient: false },
      }),
      prisma.siteLog.create({
        data: { siteId: siteBId, userId, type: "OTHER", comment: "Autre client", visibleToClient: true },
      }),
    ]);
    visibleLogId = visible.id;
    hiddenLogId = hidden.id;
    otherClientLogId = otherClient.id;
  });

  afterAll(async () => {
    await prisma.siteLog.deleteMany({ where: { id: { in: [visibleLogId, hiddenLogId, otherClientLogId] } } });
    await prisma.site.deleteMany({ where: { id: { in: [siteAId, siteBId] } } });
    await prisma.client.deleteMany({ where: { id: { in: [clientAId, clientBId] } } });
    await prisma.user.delete({ where: { id: userId } });
  });

  it("ne retourne que les rapports visibles des sites du client demandé", async () => {
    const reports = await listMySiteReports(clientAId);
    const ids = reports.map((report) => report.id);
    expect(ids).toContain(visibleLogId);
    expect(ids).not.toContain(hiddenLogId);
    expect(ids).not.toContain(otherClientLogId);
  });

  it("un autre client voit son propre rapport mais aucun rapport du premier client", async () => {
    const reports = await listMySiteReports(clientBId);
    const ids = reports.map((report) => report.id);
    expect(ids).toContain(otherClientLogId);
    expect(ids).not.toContain(visibleLogId);
    expect(ids).not.toContain(hiddenLogId);
  });
});
