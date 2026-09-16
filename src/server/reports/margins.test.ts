import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import type { SessionUser } from "@/server/auth/session";
import { parisToday } from "@/lib/dates";
import { getSiteMarginsForMonth } from "./margins";

// Site isolé (pas de mesure en delta) : la marge est calculée par site, donc
// un site dédié à ce test n'est jamais pollué par le reste de la base
// partagée (contrairement à getMonthlyRevenue, agrégé toutes factures confondues).
describe("getSiteMarginsForMonth (intégration DB)", () => {
  const suffix = Date.now();
  const today = parisToday();
  let clientId: string;
  let siteId: string;
  let siteUnknownCostId: string;
  let contractId: string;
  let adminUser: SessionUser;
  let costedAgentId: string;
  let unknownCostAgentId: string;
  let shiftId: string;
  let timeEntryId: string;
  let unknownShiftId: string;
  let unknownTimeEntryId: string;
  let invoiceId: string;

  beforeAll(async () => {
    const client = await prisma.client.create({
      data: { legalName: `Client Test Marge ${suffix}`, billingAddress: "1 rue Test" },
    });
    const site = await prisma.site.create({
      data: { clientId: client.id, name: `Site Test Marge ${suffix}`, address: "1 rue Test", city: "Caen", postalCode: "14000" },
    });
    const siteUnknownCost = await prisma.site.create({
      data: { clientId: client.id, name: `Site Test Marge Inconnu ${suffix}`, address: "1 rue Test", city: "Caen", postalCode: "14000" },
    });
    const contract = await prisma.contract.create({
      data: { clientId: client.id, reference: `C-TEST-MARGE-${suffix}`, startsOn: new Date("2020-01-01"), endsOn: new Date("2030-12-31"), status: "ACTIVE" },
    });
    const contractSite = await prisma.contractSite.create({
      data: { contractId: contract.id, siteId: site.id, hourlyRateHT: 20 },
    });

    const [admin, costedAgent, unknownCostAgent] = await Promise.all([
      prisma.user.create({
        data: { email: `test-marge-admin-${suffix}@dlproprete.fr`, name: "Admin Marge", firstName: "Admin", lastName: "Marge", role: "ADMIN", emailVerified: true },
      }),
      prisma.user.create({
        data: { email: `test-marge-coute-${suffix}@dlproprete.fr`, name: "Agent Coute", firstName: "Agent", lastName: "Coute", role: "AGENT", emailVerified: true, hourlyCostHT: 15 },
      }),
      prisma.user.create({
        data: { email: `test-marge-inconnu-${suffix}@dlproprete.fr`, name: "Agent Inconnu", firstName: "Agent", lastName: "Inconnu", role: "AGENT", emailVerified: true },
      }),
    ]);

    // Vacation de 2h ce mois-ci — la marge doit se baser sur la durée
    // planifiée (2h x 15€ = 30€ de coût), pas sur un pointage plus court/long.
    const midMonth = new Date(Date.UTC(today.year, today.month - 1, 15, 8, 0));
    const shift = await prisma.shift.create({
      data: {
        siteId: site.id, contractSiteId: contractSite.id, date: midMonth,
        startAt: midMonth, endAt: new Date(midMonth.getTime() + 2 * 3_600_000),
        requiredAgents: 1, billableMinutes: 120, status: "DONE", generatedFromTemplate: false,
      },
    });
    const timeEntry = await prisma.timeEntry.create({
      data: {
        userId: costedAgent.id, siteId: site.id, shiftId: shift.id,
        clockInAt: midMonth, clockOutAt: new Date(midMonth.getTime() + 90 * 60_000),
        status: "VALIDATED",
      },
    });

    const unknownShift = await prisma.shift.create({
      data: {
        siteId: siteUnknownCost.id, contractSiteId: contractSite.id, date: midMonth,
        startAt: midMonth, endAt: new Date(midMonth.getTime() + 3_600_000),
        requiredAgents: 1, billableMinutes: 60, status: "DONE", generatedFromTemplate: false,
      },
    });
    const unknownTimeEntry = await prisma.timeEntry.create({
      data: {
        userId: unknownCostAgent.id, siteId: siteUnknownCost.id, shiftId: unknownShift.id,
        clockInAt: midMonth, clockOutAt: new Date(midMonth.getTime() + 3_600_000),
        status: "VALIDATED",
      },
    });

    const invoice = await prisma.invoice.create({
      data: {
        clientId: client.id, contractSiteId: contractSite.id, status: "ISSUED",
        issuedOn: midMonth, amountHT: 500, amountTTC: 600, number: `F-TEST-MARGE-${suffix}`,
      },
    });

    clientId = client.id;
    siteId = site.id;
    siteUnknownCostId = siteUnknownCost.id;
    contractId = contract.id;
    adminUser = { id: admin.id, email: admin.email, role: "ADMIN", isActive: true };
    costedAgentId = costedAgent.id;
    unknownCostAgentId = unknownCostAgent.id;
    shiftId = shift.id;
    timeEntryId = timeEntry.id;
    unknownShiftId = unknownShift.id;
    unknownTimeEntryId = unknownTimeEntry.id;
    invoiceId = invoice.id;
  });

  afterAll(async () => {
    await prisma.invoice.delete({ where: { id: invoiceId } });
    await prisma.timeEntry.deleteMany({ where: { id: { in: [timeEntryId, unknownTimeEntryId] } } });
    await prisma.shift.deleteMany({ where: { id: { in: [shiftId, unknownShiftId] } } });
    await prisma.contractSite.deleteMany({ where: { contractId } });
    await prisma.contract.delete({ where: { id: contractId } });
    await prisma.site.deleteMany({ where: { id: { in: [siteId, siteUnknownCostId] } } });
    await prisma.client.delete({ where: { id: clientId } });
    await prisma.user.deleteMany({ where: { id: { in: [adminUser.id, costedAgentId, unknownCostAgentId] } } });
  });

  it("calcule le coût sur la durée planifiée de la vacation, pas la durée pointée", async () => {
    const margins = await getSiteMarginsForMonth(adminUser, today.year, today.month);
    const margin = margins.find((m) => m.siteId === siteId);
    expect(margin).toBeDefined();
    // 2h planifiées (pas les 1h30 pointées) x 15€/h = 30€.
    expect(margin!.costHT).toBeCloseTo(30, 5);
    expect(margin!.revenueHT).toBe(500);
    expect(margin!.marginHT).toBeCloseTo(470, 5);
    expect(margin!.hasUnknownCost).toBe(false);
  });

  it("signale hasUnknownCost quand l'agent n'a pas de taux renseigné, sans compter ses heures en coût", async () => {
    const margins = await getSiteMarginsForMonth(adminUser, today.year, today.month);
    const margin = margins.find((m) => m.siteId === siteUnknownCostId);
    expect(margin).toBeDefined();
    expect(margin!.hasUnknownCost).toBe(true);
    expect(margin!.costHT).toBe(0);
  });
});
