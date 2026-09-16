import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import type { SessionUser } from "@/server/auth/session";
import { monthRange, parisToday } from "@/lib/dates";
import { getMonthlyTrends } from "./trends";

// Mesuré en delta (avant/après), comme getMonthlyRevenue : la fonction
// agrège toute la base pour le mois, pas un périmètre isolable par id.
describe("getMonthlyTrends (intégration DB)", () => {
  const suffix = Date.now();
  const today = parisToday();
  let clientId: string;
  let siteId: string;
  let contractId: string;
  let adminUser: SessionUser;
  let agentId: string;
  let shiftId = "";
  let timeEntryId = "";
  let invoiceId = "";
  let absenceId = "";

  beforeAll(async () => {
    const client = await prisma.client.create({
      data: { legalName: `Client Test Tendances ${suffix}`, billingAddress: "1 rue Test" },
    });
    const site = await prisma.site.create({
      data: { clientId: client.id, name: `Site Test Tendances ${suffix}`, address: "1 rue Test", city: "Caen", postalCode: "14000" },
    });
    const contract = await prisma.contract.create({
      data: { clientId: client.id, reference: `C-TEST-TREND-${suffix}`, startsOn: new Date("2020-01-01"), endsOn: new Date("2030-12-31"), status: "ACTIVE" },
    });
    await prisma.contractSite.create({
      data: { contractId: contract.id, siteId: site.id, hourlyRateHT: 20 },
    });
    const [admin, agent] = await Promise.all([
      prisma.user.create({
        data: { email: `test-trend-admin-${suffix}@dlproprete.fr`, name: "Admin Tendances", firstName: "Admin", lastName: "Tendances", role: "ADMIN", emailVerified: true },
      }),
      prisma.user.create({
        data: { email: `test-trend-agent-${suffix}@dlproprete.fr`, name: "Agent Tendances", firstName: "Agent", lastName: "Tendances", role: "AGENT", emailVerified: true },
      }),
    ]);

    clientId = client.id;
    siteId = site.id;
    contractId = contract.id;
    adminUser = { id: admin.id, email: admin.email, role: "ADMIN", isActive: true };
    agentId = agent.id;
  });

  afterAll(async () => {
    // Un id vide ("" — jamais renseigné si le test échoue avant de l'affecter)
    // filtre sur `in: [""]`, qui ne matche jamais rien — jamais `undefined`,
    // qui viderait tout le tableau (piège deleteMany sans filtre).
    await prisma.invoice.deleteMany({ where: { id: { in: [invoiceId] } } });
    await prisma.absence.deleteMany({ where: { id: { in: [absenceId] } } });
    await prisma.timeEntry.deleteMany({ where: { id: { in: [timeEntryId] } } });
    await prisma.shift.deleteMany({ where: { id: { in: [shiftId] } } });
    await prisma.contractSite.deleteMany({ where: { contractId } });
    await prisma.contract.delete({ where: { id: contractId } });
    await prisma.site.delete({ where: { id: siteId } });
    await prisma.client.delete({ where: { id: clientId } });
    await prisma.user.deleteMany({ where: { id: { in: [adminUser.id, agentId] } } });
  });

  it("ajoute le CA, les heures validées (durée planifiée) et les absences approuvées du mois en cours", async () => {
    const { start } = monthRange(today.year, today.month);
    const before = await getMonthlyTrends(adminUser, 1);
    const beforeMonth = before[0];

    const contractSite = await prisma.contractSite.findFirstOrThrow({ where: { contractId } });

    const shift = await prisma.shift.create({
      data: {
        siteId, contractSiteId: contractSite.id, date: start,
        startAt: start, endAt: new Date(start.getTime() + 3 * 3_600_000),
        requiredAgents: 1, billableMinutes: 180, status: "DONE", generatedFromTemplate: false,
      },
    });
    const timeEntry = await prisma.timeEntry.create({
      data: { userId: agentId, siteId, shiftId: shift.id, clockInAt: start, clockOutAt: new Date(start.getTime() + 3_600_000), status: "VALIDATED" },
    });
    const invoice = await prisma.invoice.create({
      data: { clientId, contractSiteId: contractSite.id, status: "ISSUED", issuedOn: start, amountHT: 200, amountTTC: 240, number: `F-TEST-TREND-${suffix}` },
    });
    const absence = await prisma.absence.create({
      data: { userId: agentId, type: "PAID_LEAVE", startsOn: start, endsOn: start, status: "APPROVED" },
    });

    shiftId = shift.id;
    timeEntryId = timeEntry.id;
    invoiceId = invoice.id;
    absenceId = absence.id;

    const after = await getMonthlyTrends(adminUser, 1);
    const afterMonth = after[0];

    expect(afterMonth.revenueHT - beforeMonth.revenueHT).toBe(200);
    // Durée planifiée (3h), pas la durée pointée (1h) — même règle que la marge.
    expect(afterMonth.hours - beforeMonth.hours).toBeCloseTo(3, 5);
    expect(afterMonth.absences - beforeMonth.absences).toBe(1);
  });
});
