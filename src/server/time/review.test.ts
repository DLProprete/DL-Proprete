import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import type { SessionUser } from "@/server/auth/session";
import { listTimeEntriesForReview, validateTimeEntriesBulk } from "./review";

// Test d'intégration : filtres, pagination et validation en masse
// dépendent tous de requêtes Prisma réelles (M3 de l'audit du 31/08/2026).
describe("validation des pointages à l'échelle (intégration DB)", () => {
  const suffix = Date.now();
  let clientId: string;
  let siteAId: string;
  let agentAId: string;
  let agentBId: string;
  let adminUser: SessionUser;
  let entryIds: string[] = [];

  beforeAll(async () => {
    const client = await prisma.client.create({
      data: { legalName: "Client Test Review", billingAddress: "1 rue Test" },
    });
    const siteA = await prisma.site.create({
      data: { clientId: client.id, name: "Site A", address: "1 rue A", city: "Caen", postalCode: "14000" },
    });
    const siteB = await prisma.site.create({
      data: { clientId: client.id, name: "Site B", address: "1 rue B", city: "Caen", postalCode: "14000" },
    });
    const agentA = await prisma.user.create({
      data: {
        email: `test-review-agent-a-${suffix}@dlproprete.fr`,
        name: "Agent A",
        firstName: "Agent",
        lastName: "A",
        role: "AGENT",
        emailVerified: true,
      },
    });
    const agentB = await prisma.user.create({
      data: {
        email: `test-review-agent-b-${suffix}@dlproprete.fr`,
        name: "Agent B",
        firstName: "Agent",
        lastName: "B",
        role: "AGENT",
        emailVerified: true,
      },
    });
    const admin = await prisma.user.create({
      data: {
        email: `test-review-admin-${suffix}@dlproprete.fr`,
        name: "Admin Review",
        firstName: "Admin",
        lastName: "Review",
        role: "ADMIN",
        emailVerified: true,
      },
    });

    // Pas de shift lié : ces pointages "hors planning" n'entrent pas dans le
    // périmètre des tests ci-dessous (juste des fixtures SUBMITTED simples).
    const entries = await Promise.all([
      prisma.timeEntry.create({
        data: {
          userId: agentA.id,
          siteId: siteA.id,
          clockInAt: new Date(Date.now() - 3 * 3_600_000),
          clockOutAt: new Date(Date.now() - 2 * 3_600_000),
          status: "SUBMITTED",
        },
      }),
      prisma.timeEntry.create({
        data: {
          userId: agentB.id,
          siteId: siteB.id,
          clockInAt: new Date(Date.now() - 5 * 3_600_000),
          clockOutAt: new Date(Date.now() - 4 * 3_600_000),
          status: "SUBMITTED",
        },
      }),
    ]);

    clientId = client.id;
    siteAId = siteA.id;
    agentAId = agentA.id;
    agentBId = agentB.id;
    adminUser = { id: admin.id, email: admin.email, role: "ADMIN", isActive: true };
    entryIds = entries.map((entry) => entry.id);
  });

  afterAll(async () => {
    await prisma.auditLog.deleteMany({ where: { entityId: { in: entryIds } } });
    await prisma.timeEntry.deleteMany({ where: { userId: { in: [agentAId, agentBId] } } });
    await prisma.user.deleteMany({ where: { id: { in: [agentAId, agentBId, adminUser.id] } } });
    await prisma.site.deleteMany({ where: { clientId } });
    await prisma.client.delete({ where: { id: clientId } });
  });

  it("filtre par site", async () => {
    const result = await listTimeEntriesForReview(adminUser, { siteId: siteAId });
    expect(result.items.map((item) => item.id)).toEqual([entryIds[0]]);
  });

  it("filtre par agent", async () => {
    const result = await listTimeEntriesForReview(adminUser, { userId: agentBId });
    expect(result.items.map((item) => item.id)).toEqual([entryIds[1]]);
  });

  it("pagination : page/pageSize/total cohérents", async () => {
    const result = await listTimeEntriesForReview(adminUser, {
      userId: agentAId,
      page: 1,
    });
    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(25);
    expect(result.total).toBe(1);
  });

  it("validateTimeEntriesBulk valide plusieurs pointages et journalise une ligne par entrée", async () => {
    const result = await validateTimeEntriesBulk(adminUser, entryIds);
    expect(result.validated).toEqual(entryIds);
    expect(result.skipped).toEqual([]);

    for (const id of entryIds) {
      const entry = await prisma.timeEntry.findUniqueOrThrow({ where: { id } });
      expect(entry.status).toBe("VALIDATED");
      const auditRows = await prisma.auditLog.count({
        where: { action: "TIME_VALIDATED", entityType: "TimeEntry", entityId: id },
      });
      expect(auditRows).toBe(1);
    }
  });

  it("validateTimeEntriesBulk ignore silencieusement une entrée déjà traitée", async () => {
    // Les deux entrées ont déjà été validées par le test précédent.
    const result = await validateTimeEntriesBulk(adminUser, entryIds);
    expect(result.validated).toEqual([]);
    expect(result.skipped).toEqual(entryIds);
  });
});
