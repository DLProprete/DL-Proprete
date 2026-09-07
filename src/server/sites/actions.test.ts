import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { ForbiddenError, type SessionUser } from "@/server/auth/session";
import { createSite, createSiteLog, setSiteActive, setSiteLogVisibility } from "./actions";
import { listSites, getSite } from "./queries";

const agent: SessionUser = { id: "u-agent", email: "agent@dlproprete.fr", role: "AGENT", isActive: true };

const validInput = {
  clientId: "any-client-id",
  name: "Site Test",
  address: "1 rue du Test",
  city: "Caen",
  postalCode: "14000",
} as const;

describe("droits Site — un AGENT reçoit un refus (403)", () => {
  it("listSites rejette un AGENT", async () => {
    await expect(listSites(agent)).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("getSite rejette un AGENT", async () => {
    await expect(getSite(agent, "any-id")).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("createSite rejette un AGENT", async () => {
    await expect(createSite(agent, validInput)).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("setSiteActive rejette un AGENT", async () => {
    await expect(setSiteActive(agent, "any-id", false)).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("setSiteLogVisibility rejette un AGENT", async () => {
    await expect(setSiteLogVisibility(agent, "any-id", false)).rejects.toBeInstanceOf(ForbiddenError);
  });
});

// Un AGENT ne doit pouvoir logger que sur un site où il a une vacation
// affectée — sinon, changer siteId dans le formulaire donnait accès à la
// main courante de n'importe quel client (voir revue de sécurité).
describe("createSiteLog — un AGENT ne logue que sur ses propres sites (intégration DB)", () => {
  const suffix = Date.now();
  let clientId: string;
  let siteWorkedId: string;
  let siteNeverId: string;
  let contractId: string;
  let shiftId: string;
  let agentId: string;
  let agentUser: SessionUser;
  let createdLogId: string | null = null;

  beforeAll(async () => {
    const client = await prisma.client.create({
      data: { legalName: `Client Test SiteLog ${suffix}`, billingAddress: "1 rue Test" },
    });
    const [siteWorked, siteNever] = await Promise.all([
      prisma.site.create({
        data: { clientId: client.id, name: "Site loggable", address: "1 rue Test", city: "Caen", postalCode: "14000" },
      }),
      prisma.site.create({
        data: { clientId: client.id, name: "Site interdit", address: "2 rue Test", city: "Caen", postalCode: "14000" },
      }),
    ]);
    const contract = await prisma.contract.create({
      data: {
        clientId: client.id,
        reference: `C-TEST-SITELOG-${suffix}`,
        startsOn: new Date("2020-01-01"),
        endsOn: new Date("2030-12-31"),
        status: "ACTIVE",
      },
    });
    const contractSite = await prisma.contractSite.create({
      data: { contractId: contract.id, siteId: siteWorked.id, hourlyRateHT: 20 },
    });
    const agentRow = await prisma.user.create({
      data: {
        email: `test-sitelog-agent-${suffix}@dlproprete.fr`,
        name: "Agent SiteLog",
        firstName: "Agent",
        lastName: "SiteLog",
        role: "AGENT",
        emailVerified: true,
      },
    });
    const shift = await prisma.shift.create({
      data: {
        siteId: siteWorked.id,
        contractSiteId: contractSite.id,
        date: new Date("2031-02-10"),
        startAt: new Date("2031-02-10T06:00:00Z"),
        endAt: new Date("2031-02-10T08:00:00Z"),
        requiredAgents: 1,
        billableMinutes: 120,
        status: "PLANNED",
        generatedFromTemplate: false,
      },
    });
    await prisma.assignment.create({ data: { shiftId: shift.id, userId: agentRow.id, status: "ASSIGNED" } });

    clientId = client.id;
    siteWorkedId = siteWorked.id;
    siteNeverId = siteNever.id;
    contractId = contract.id;
    shiftId = shift.id;
    agentId = agentRow.id;
    agentUser = { id: agentRow.id, email: agentRow.email, role: "AGENT", isActive: true };
  });

  afterAll(async () => {
    if (createdLogId) await prisma.siteLog.delete({ where: { id: createdLogId } });
    await prisma.assignment.deleteMany({ where: { shiftId } });
    await prisma.shift.delete({ where: { id: shiftId } });
    await prisma.contractSite.deleteMany({ where: { contractId } });
    await prisma.contract.delete({ where: { id: contractId } });
    await prisma.site.deleteMany({ where: { id: { in: [siteWorkedId, siteNeverId] } } });
    await prisma.client.delete({ where: { id: clientId } });
    await prisma.user.delete({ where: { id: agentId } });
  });

  it("refuse de logger sur un site où l'agent n'est jamais intervenu", async () => {
    await expect(
      createSiteLog(agentUser, { siteId: siteNeverId, type: "OTHER", comment: "Test" }),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("autorise de logger sur un site où l'agent a une vacation affectée", async () => {
    const log = await createSiteLog(agentUser, { siteId: siteWorkedId, type: "OTHER", comment: "Test" });
    createdLogId = log.id;
    expect(log.siteId).toBe(siteWorkedId);
  });

  it("visibleToClient vaut true par défaut, et se désactive/réactive via setSiteLogVisibility", async () => {
    const admin: SessionUser = { id: "u-admin", email: "admin@dlproprete.fr", role: "ADMIN", isActive: true };
    const log = await createSiteLog(agentUser, { siteId: siteWorkedId, type: "OTHER", comment: "Test visibilité" });
    expect(log.visibleToClient).toBe(true);

    const hidden = await setSiteLogVisibility(admin, log.id, false);
    expect(hidden.visibleToClient).toBe(false);

    const shown = await setSiteLogVisibility(admin, log.id, true);
    expect(shown.visibleToClient).toBe(true);

    await prisma.siteLog.delete({ where: { id: log.id } });
  });
});
