import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import type { SessionUser } from "@/server/auth/session";
import { getOverdueAgentsForSite, listCheckInsForSite } from "./queries";

// Site isolé : la détection de retard dérive des pointages récents du site,
// jamais mesurable en delta sur la base partagée.
describe("getOverdueAgentsForSite / listCheckInsForSite (intégration DB)", () => {
  const suffix = Date.now();
  let clientId: string;
  let siteId: string;
  let contractId: string;
  let adminUser: SessionUser;
  let freshAgentId: string;
  let staleAgentId: string;
  let neverCheckedAgentId: string;
  let inactiveAgentId: string;
  const shiftIds: string[] = [];
  const timeEntryIds: string[] = [];
  const checkInIds: string[] = [];

  beforeAll(async () => {
    const client = await prisma.client.create({
      data: { legalName: `Client Test CheckIn ${suffix}`, billingAddress: "1 rue Test" },
    });
    const site = await prisma.site.create({
      data: { clientId: client.id, name: `Site Test CheckIn ${suffix}`, address: "1 rue Test", city: "Caen", postalCode: "14000" },
    });
    const contract = await prisma.contract.create({
      data: { clientId: client.id, reference: `C-TEST-CHECKIN-${suffix}`, startsOn: new Date("2020-01-01"), endsOn: new Date("2030-12-31"), status: "ACTIVE" },
    });
    const contractSite = await prisma.contractSite.create({
      data: { contractId: contract.id, siteId: site.id, hourlyRateHT: 20 },
    });

    const [admin, freshAgent, staleAgent, neverCheckedAgent, inactiveAgent] = await Promise.all([
      prisma.user.create({
        data: { email: `test-checkin-admin-${suffix}@dlproprete.fr`, name: "Admin CheckIn", firstName: "Admin", lastName: "CheckIn", role: "ADMIN", emailVerified: true },
      }),
      prisma.user.create({
        data: { email: `test-checkin-fresh-${suffix}@dlproprete.fr`, name: "Agent Fresh", firstName: "Agent", lastName: "Fresh", role: "AGENT", emailVerified: true },
      }),
      prisma.user.create({
        data: { email: `test-checkin-stale-${suffix}@dlproprete.fr`, name: "Agent Stale", firstName: "Agent", lastName: "Stale", role: "AGENT", emailVerified: true },
      }),
      prisma.user.create({
        data: { email: `test-checkin-never-${suffix}@dlproprete.fr`, name: "Agent Never", firstName: "Agent", lastName: "Never", role: "AGENT", emailVerified: true },
      }),
      prisma.user.create({
        data: { email: `test-checkin-inactive-${suffix}@dlproprete.fr`, name: "Agent Inactive", firstName: "Agent", lastName: "Inactive", role: "AGENT", emailVerified: true },
      }),
    ]);

    // Les 3 premiers ont pointé récemment (dans la fenêtre d'activité) ;
    // "inactive" n'a jamais pointé sur ce site — ne doit jamais apparaître.
    const recentDate = new Date(Date.now() - 5 * 86_400_000);
    for (const agentId of [freshAgent.id, staleAgent.id, neverCheckedAgent.id]) {
      const shift = await prisma.shift.create({
        data: {
          siteId: site.id, contractSiteId: contractSite.id, date: recentDate,
          startAt: recentDate, endAt: new Date(recentDate.getTime() + 3_600_000),
          requiredAgents: 1, billableMinutes: 60, status: "DONE", generatedFromTemplate: false,
        },
      });
      const entry = await prisma.timeEntry.create({
        data: { userId: agentId, siteId: site.id, shiftId: shift.id, clockInAt: recentDate, clockOutAt: new Date(recentDate.getTime() + 3_600_000), status: "VALIDATED" },
      });
      shiftIds.push(shift.id);
      timeEntryIds.push(entry.id);
    }

    const freshCheckIn = await prisma.agentSiteCheckIn.create({
      data: { userId: freshAgent.id, siteId: site.id, authorId: admin.id, occurredOn: new Date(Date.now() - 5 * 86_400_000), note: "Point récent" },
    });
    const staleCheckIn = await prisma.agentSiteCheckIn.create({
      data: { userId: staleAgent.id, siteId: site.id, authorId: admin.id, occurredOn: new Date(Date.now() - 45 * 86_400_000), note: "Point ancien" },
    });
    checkInIds.push(freshCheckIn.id, staleCheckIn.id);

    clientId = client.id;
    siteId = site.id;
    contractId = contract.id;
    adminUser = { id: admin.id, email: admin.email, role: "ADMIN", isActive: true };
    freshAgentId = freshAgent.id;
    staleAgentId = staleAgent.id;
    neverCheckedAgentId = neverCheckedAgent.id;
    inactiveAgentId = inactiveAgent.id;
  });

  afterAll(async () => {
    await prisma.agentSiteCheckIn.deleteMany({ where: { id: { in: checkInIds } } });
    await prisma.timeEntry.deleteMany({ where: { id: { in: timeEntryIds } } });
    await prisma.shift.deleteMany({ where: { id: { in: shiftIds } } });
    await prisma.contractSite.deleteMany({ where: { contractId } });
    await prisma.contract.delete({ where: { id: contractId } });
    await prisma.site.delete({ where: { id: siteId } });
    await prisma.client.delete({ where: { id: clientId } });
    await prisma.user.deleteMany({ where: { id: { in: [adminUser.id, freshAgentId, staleAgentId, neverCheckedAgentId, inactiveAgentId] } } });
  });

  it("n'inclut pas un agent avec un point récent (<30 jours)", async () => {
    const overdue = await getOverdueAgentsForSite(adminUser, siteId);
    expect(overdue.map((a) => a.userId)).not.toContain(freshAgentId);
  });

  it("inclut un agent actif dont le dernier point date de plus de 30 jours, avec sa date", async () => {
    const overdue = await getOverdueAgentsForSite(adminUser, siteId);
    const stale = overdue.find((a) => a.userId === staleAgentId);
    expect(stale).toBeDefined();
    expect(stale!.lastCheckInOn).not.toBeNull();
  });

  it("inclut un agent actif sans aucun point, avec lastCheckInOn null", async () => {
    const overdue = await getOverdueAgentsForSite(adminUser, siteId);
    const never = overdue.find((a) => a.userId === neverCheckedAgentId);
    expect(never).toBeDefined();
    expect(never!.lastCheckInOn).toBeNull();
  });

  it("n'inclut jamais un agent qui n'a pas pointé sur ce site", async () => {
    const overdue = await getOverdueAgentsForSite(adminUser, siteId);
    expect(overdue.map((a) => a.userId)).not.toContain(inactiveAgentId);
  });

  it("liste les points du site du plus récent au plus ancien", async () => {
    const list = await listCheckInsForSite(adminUser, siteId);
    const dates = list.map((c) => c.occurredOn.getTime());
    expect(dates).toEqual([...dates].sort((a, b) => b - a));
    expect(list.length).toBe(2);
  });
});
