import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { ForbiddenError, type SessionUser } from "@/server/auth/session";
import { createCheckIn } from "./actions";

describe("createCheckIn (intégration DB)", () => {
  const suffix = Date.now();
  let clientId: string;
  let siteId: string;
  let adminUser: SessionUser;
  let plannerUser: SessionUser;
  let agentUser: SessionUser;
  const checkInIds: string[] = [];

  beforeAll(async () => {
    const client = await prisma.client.create({
      data: { legalName: `Client Test CheckIn Actions ${suffix}`, billingAddress: "1 rue Test" },
    });
    const site = await prisma.site.create({
      data: { clientId: client.id, name: `Site Test CheckIn Actions ${suffix}`, address: "1 rue Test", city: "Caen", postalCode: "14000" },
    });
    const [admin, planner, agent] = await Promise.all([
      prisma.user.create({
        data: { email: `test-checkin-act-admin-${suffix}@dlproprete.fr`, name: "Admin", firstName: "Admin", lastName: "Act", role: "ADMIN", emailVerified: true },
      }),
      prisma.user.create({
        data: { email: `test-checkin-act-planner-${suffix}@dlproprete.fr`, name: "Planner", firstName: "Planner", lastName: "Act", role: "PLANNER", emailVerified: true },
      }),
      prisma.user.create({
        data: { email: `test-checkin-act-agent-${suffix}@dlproprete.fr`, name: "Agent", firstName: "Agent", lastName: "Act", role: "AGENT", emailVerified: true },
      }),
    ]);

    clientId = client.id;
    siteId = site.id;
    adminUser = { id: admin.id, email: admin.email, role: "ADMIN", isActive: true };
    plannerUser = { id: planner.id, email: planner.email, role: "PLANNER", isActive: true };
    agentUser = { id: agent.id, email: agent.email, role: "AGENT", isActive: true };
  });

  afterAll(async () => {
    await prisma.agentSiteCheckIn.deleteMany({ where: { id: { in: checkInIds } } });
    await prisma.site.delete({ where: { id: siteId } });
    await prisma.client.delete({ where: { id: clientId } });
    await prisma.user.deleteMany({ where: { id: { in: [adminUser.id, plannerUser.id, agentUser.id] } } });
  });

  it("ADMIN et PLANNER peuvent créer un point, avec authorId = l'auteur réel", async () => {
    const checkIn = await createCheckIn(plannerUser, siteId, {
      userId: agentUser.id,
      occurredOn: "2026-09-10",
      note: "  Échange positif sur le site.  ",
    });
    checkInIds.push(checkIn.id);
    expect(checkIn.authorId).toBe(plannerUser.id);
    expect(checkIn.userId).toBe(agentUser.id);
    expect(checkIn.note).toBe("Échange positif sur le site.");
  });

  it("rejette un AGENT (ForbiddenError)", async () => {
    await expect(
      createCheckIn(agentUser, siteId, { userId: agentUser.id, occurredOn: "2026-09-10", note: "Test" }),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("rejette une note vide (validation Zod)", async () => {
    await expect(
      createCheckIn(adminUser, siteId, { userId: agentUser.id, occurredOn: "2026-09-10", note: "" }),
    ).rejects.toThrow();
  });

  it("rejette un userId qui ne correspond pas à un agent de terrain", async () => {
    await expect(
      createCheckIn(adminUser, siteId, { userId: adminUser.id, occurredOn: "2026-09-10", note: "Test" }),
    ).rejects.toThrow(/agent de terrain/);
  });
});
