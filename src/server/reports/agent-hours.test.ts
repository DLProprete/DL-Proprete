import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import type { SessionUser } from "@/server/auth/session";
import { parisToday } from "@/lib/dates";
import { getAgentHoursUtilization } from "./agent-hours";

describe("getAgentHoursUtilization (intégration DB)", () => {
  const suffix = Date.now();
  const today = parisToday();
  let clientId: string;
  let siteId: string;
  let contractId: string;
  let adminUser: SessionUser;
  let agentWithContractId: string;
  let agentNoContractId: string;
  let shiftId: string;
  let timeEntryId: string;

  beforeAll(async () => {
    const client = await prisma.client.create({
      data: { legalName: `Client Test Heures ${suffix}`, billingAddress: "1 rue Test" },
    });
    const site = await prisma.site.create({
      data: { clientId: client.id, name: `Site Test Heures ${suffix}`, address: "1 rue Test", city: "Caen", postalCode: "14000" },
    });
    const contract = await prisma.contract.create({
      data: { clientId: client.id, reference: `C-TEST-HEURES-${suffix}`, startsOn: new Date("2020-01-01"), endsOn: new Date("2030-12-31"), status: "ACTIVE" },
    });
    const contractSite = await prisma.contractSite.create({
      data: { contractId: contract.id, siteId: site.id, hourlyRateHT: 20 },
    });

    const [admin, agentWithContract, agentNoContract] = await Promise.all([
      prisma.user.create({
        data: { email: `test-heures-admin-${suffix}@dlproprete.fr`, name: "Admin Heures", firstName: "Admin", lastName: "Heures", role: "ADMIN", emailVerified: true },
      }),
      prisma.user.create({
        data: { email: `test-heures-contrat-${suffix}@dlproprete.fr`, name: "Agent Contrat", firstName: "Agent", lastName: "Contrat", role: "AGENT", emailVerified: true, weeklyContractHours: 35 },
      }),
      prisma.user.create({
        data: { email: `test-heures-sanscontrat-${suffix}@dlproprete.fr`, name: "Agent SansContrat", firstName: "Agent", lastName: "SansContrat", role: "AGENT", emailVerified: true },
      }),
    ]);

    const midMonth = new Date(Date.UTC(today.year, today.month - 1, 15, 8, 0));
    const shift = await prisma.shift.create({
      data: {
        siteId: site.id, contractSiteId: contractSite.id, date: midMonth,
        startAt: midMonth, endAt: new Date(midMonth.getTime() + 5 * 3_600_000),
        requiredAgents: 1, billableMinutes: 300, status: "DONE", generatedFromTemplate: false,
      },
    });
    const timeEntry = await prisma.timeEntry.create({
      data: {
        userId: agentWithContract.id, siteId: site.id, shiftId: shift.id,
        clockInAt: midMonth, clockOutAt: new Date(midMonth.getTime() + 4 * 3_600_000),
        status: "VALIDATED",
      },
    });

    clientId = client.id;
    siteId = site.id;
    contractId = contract.id;
    adminUser = { id: admin.id, email: admin.email, role: "ADMIN", isActive: true };
    agentWithContractId = agentWithContract.id;
    agentNoContractId = agentNoContract.id;
    shiftId = shift.id;
    timeEntryId = timeEntry.id;
  });

  afterAll(async () => {
    await prisma.timeEntry.delete({ where: { id: timeEntryId } });
    await prisma.shift.delete({ where: { id: shiftId } });
    await prisma.contractSite.deleteMany({ where: { contractId } });
    await prisma.contract.delete({ where: { id: contractId } });
    await prisma.site.delete({ where: { id: siteId } });
    await prisma.client.delete({ where: { id: clientId } });
    await prisma.user.deleteMany({ where: { id: { in: [adminUser.id, agentWithContractId, agentNoContractId] } } });
  });

  it("calcule l'écart sur la durée planifiée (pas pointée) contre l'équivalent mensuel du contrat", async () => {
    const results = await getAgentHoursUtilization(adminUser, today.year, today.month);
    const agent = results.find((r) => r.userId === agentWithContractId);
    expect(agent).toBeDefined();
    // 5h planifiées (pas les 4h pointées), contrat 35h/sem x 52/12 ≈ 151.67h.
    expect(agent!.validatedHours).toBeCloseTo(5, 5);
    expect(agent!.contractualHours).toBeCloseTo((35 * 52) / 12, 5);
    expect(agent!.deltaHours).toBeCloseTo(5 - (35 * 52) / 12, 5);
  });

  it("renvoie contractualHours et deltaHours à null quand l'agent n'a pas de taux contractuel", async () => {
    const results = await getAgentHoursUtilization(adminUser, today.year, today.month);
    const agent = results.find((r) => r.userId === agentNoContractId);
    expect(agent).toBeDefined();
    expect(agent!.contractualHours).toBeNull();
    expect(agent!.deltaHours).toBeNull();
    expect(agent!.validatedHours).toBe(0);
  });
});
