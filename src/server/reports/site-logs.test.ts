import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import type { SessionUser } from "@/server/auth/session";
import { parisToday } from "@/lib/dates";
import { getSiteLogSummary } from "./site-logs";

describe("getSiteLogSummary (intégration DB)", () => {
  const suffix = Date.now();
  const today = parisToday();
  let clientId: string;
  let busySiteId: string;
  let quietSiteId: string;
  let adminUser: SessionUser;
  let agentId: string;
  const logIds: string[] = [];

  beforeAll(async () => {
    const client = await prisma.client.create({
      data: { legalName: `Client Test Main Courante ${suffix}`, billingAddress: "1 rue Test" },
    });
    const [busySite, quietSite, admin, agent] = await Promise.all([
      prisma.site.create({
        data: { clientId: client.id, name: `Site Test MC Chargé ${suffix}`, address: "1 rue Test", city: "Caen", postalCode: "14000" },
      }),
      prisma.site.create({
        data: { clientId: client.id, name: `Site Test MC Calme ${suffix}`, address: "1 rue Test", city: "Caen", postalCode: "14000" },
      }),
      prisma.user.create({
        data: { email: `test-mc-admin-${suffix}@dlproprete.fr`, name: "Admin MC", firstName: "Admin", lastName: "MC", role: "ADMIN", emailVerified: true },
      }),
      prisma.user.create({
        data: { email: `test-mc-agent-${suffix}@dlproprete.fr`, name: "Agent MC", firstName: "Agent", lastName: "MC", role: "AGENT", emailVerified: true },
      }),
    ]);

    const midMonth = new Date(Date.UTC(today.year, today.month - 1, 15, 10, 0));
    const [log1, log2, log3, log4] = await Promise.all([
      prisma.siteLog.create({ data: { siteId: busySite.id, userId: agent.id, type: "ANOMALY", comment: "Test 1", createdAt: midMonth } }),
      prisma.siteLog.create({ data: { siteId: busySite.id, userId: agent.id, type: "ANOMALY", comment: "Test 2", createdAt: midMonth } }),
      prisma.siteLog.create({ data: { siteId: busySite.id, userId: agent.id, type: "EQUIPMENT", comment: "Test 3", createdAt: midMonth } }),
      prisma.siteLog.create({ data: { siteId: quietSite.id, userId: agent.id, type: "OTHER", comment: "Test 4", createdAt: midMonth } }),
    ]);

    clientId = client.id;
    busySiteId = busySite.id;
    quietSiteId = quietSite.id;
    adminUser = { id: admin.id, email: admin.email, role: "ADMIN", isActive: true };
    agentId = agent.id;
    logIds.push(log1.id, log2.id, log3.id, log4.id);
  });

  afterAll(async () => {
    await prisma.siteLog.deleteMany({ where: { id: { in: logIds } } });
    await prisma.site.deleteMany({ where: { id: { in: [busySiteId, quietSiteId] } } });
    await prisma.client.delete({ where: { id: clientId } });
    await prisma.user.deleteMany({ where: { id: { in: [adminUser.id, agentId] } } });
  });

  it("regroupe les entrées par site et par type", async () => {
    const summary = await getSiteLogSummary(adminUser, today.year, today.month);
    const busy = summary.find((s) => s.siteId === busySiteId);
    expect(busy).toEqual({ siteId: busySiteId, siteName: expect.any(String), anomaly: 2, equipment: 1, other: 0, total: 3 });
  });

  it("trie par total décroissant (site à problème en premier)", async () => {
    const summary = await getSiteLogSummary(adminUser, today.year, today.month);
    const busyIndex = summary.findIndex((s) => s.siteId === busySiteId);
    const quietIndex = summary.findIndex((s) => s.siteId === quietSiteId);
    expect(busyIndex).toBeGreaterThanOrEqual(0);
    expect(quietIndex).toBeGreaterThanOrEqual(0);
    expect(busyIndex).toBeLessThan(quietIndex);
  });
});
