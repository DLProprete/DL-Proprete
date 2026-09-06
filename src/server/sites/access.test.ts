import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { agentHasWorkedAtSite } from "./access";

describe("agentHasWorkedAtSite (intégration DB)", () => {
  const suffix = Date.now();
  let clientId: string;
  let siteWorkedId: string;
  let siteNeverId: string;
  let contractId: string;
  let shiftId: string;
  let agentId: string;

  beforeAll(async () => {
    const client = await prisma.client.create({
      data: { legalName: `Client Test Access ${suffix}`, billingAddress: "1 rue Test" },
    });
    const [siteWorked, siteNever] = await Promise.all([
      prisma.site.create({
        data: { clientId: client.id, name: "Site travaillé", address: "1 rue Test", city: "Caen", postalCode: "14000" },
      }),
      prisma.site.create({
        data: { clientId: client.id, name: "Site jamais visité", address: "2 rue Test", city: "Caen", postalCode: "14000" },
      }),
    ]);
    const contract = await prisma.contract.create({
      data: {
        clientId: client.id,
        reference: `C-TEST-ACCESS-${suffix}`,
        startsOn: new Date("2020-01-01"),
        endsOn: new Date("2030-12-31"),
        status: "ACTIVE",
      },
    });
    const contractSite = await prisma.contractSite.create({
      data: { contractId: contract.id, siteId: siteWorked.id, hourlyRateHT: 20 },
    });
    const agent = await prisma.user.create({
      data: {
        email: `test-access-agent-${suffix}@dlproprete.fr`,
        name: "Agent Access",
        firstName: "Agent",
        lastName: "Access",
        role: "AGENT",
        emailVerified: true,
      },
    });
    const shift = await prisma.shift.create({
      data: {
        siteId: siteWorked.id,
        contractSiteId: contractSite.id,
        date: new Date("2031-01-10"),
        startAt: new Date("2031-01-10T06:00:00Z"),
        endAt: new Date("2031-01-10T08:00:00Z"),
        requiredAgents: 1,
        billableMinutes: 120,
        status: "PLANNED",
        generatedFromTemplate: false,
      },
    });
    await prisma.assignment.create({ data: { shiftId: shift.id, userId: agent.id, status: "ASSIGNED" } });

    clientId = client.id;
    siteWorkedId = siteWorked.id;
    siteNeverId = siteNever.id;
    contractId = contract.id;
    shiftId = shift.id;
    agentId = agent.id;
  });

  afterAll(async () => {
    await prisma.assignment.deleteMany({ where: { shiftId } });
    await prisma.shift.delete({ where: { id: shiftId } });
    await prisma.contractSite.deleteMany({ where: { contractId } });
    await prisma.contract.delete({ where: { id: contractId } });
    await prisma.site.deleteMany({ where: { id: { in: [siteWorkedId, siteNeverId] } } });
    await prisma.client.delete({ where: { id: clientId } });
    await prisma.user.delete({ where: { id: agentId } });
  });

  it("retourne true pour un site où l'agent a une vacation affectée", async () => {
    expect(await agentHasWorkedAtSite(agentId, siteWorkedId)).toBe(true);
  });

  it("retourne false pour un site où l'agent n'est jamais intervenu", async () => {
    expect(await agentHasWorkedAtSite(agentId, siteNeverId)).toBe(false);
  });
});
