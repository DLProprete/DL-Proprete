import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import type { SessionUser } from "@/server/auth/session";
import { dateOnlyUTC, parisToday, startOfWeekMonday } from "@/lib/dates";
import { listWeekShiftsForAgent, getAgentMonthlyHours } from "./queries";

// Test d'intégration : planning de la semaine et heures du mois côté agent
// (M6 de l'audit du 31/08/2026) — le point sensible est le scope par
// agent : un AGENT ne doit jamais voir les shifts/heures d'un autre.
describe("planning de la semaine et heures du mois (intégration DB)", () => {
  const suffix = Date.now();
  let clientId: string;
  let siteId: string;
  let contractId: string;
  let shiftId: string;
  let agentAId: string;
  let agentBId: string;
  let agentA: SessionUser;
  let entryIds: string[] = [];

  beforeAll(async () => {
    const client = await prisma.client.create({
      data: { legalName: "Client Test Semaine", billingAddress: "1 rue Test" },
    });
    const site = await prisma.site.create({
      data: { clientId: client.id, name: "Site Test Semaine", address: "1 rue Test", city: "Caen", postalCode: "14000" },
    });
    const contract = await prisma.contract.create({
      data: {
        clientId: client.id,
        siteId: site.id,
        reference: `C-TEST-SEMAINE-${suffix}`,
        startsOn: new Date("2020-01-01"),
        endsOn: new Date("2030-12-31"),
        hourlyRateHT: 20,
        status: "ACTIVE",
      },
    });
    const agentARow = await prisma.user.create({
      data: {
        email: `test-week-agent-a-${suffix}@dlproprete.fr`,
        name: "Agent Semaine A",
        firstName: "Agent",
        lastName: "SemaineA",
        role: "AGENT",
        emailVerified: true,
      },
    });
    const agentBRow = await prisma.user.create({
      data: {
        email: `test-week-agent-b-${suffix}@dlproprete.fr`,
        name: "Agent Semaine B",
        firstName: "Agent",
        lastName: "SemaineB",
        role: "AGENT",
        emailVerified: true,
      },
    });

    const today = parisToday();
    const monday = startOfWeekMonday(dateOnlyUTC(today.year, today.month, today.day));
    const shift = await prisma.shift.create({
      data: {
        siteId: site.id,
        contractId: contract.id,
        date: monday,
        startAt: new Date(monday.getTime() + 6 * 3_600_000),
        endAt: new Date(monday.getTime() + 8 * 3_600_000),
        requiredAgents: 1,
        billableMinutes: 120,
        status: "PLANNED",
        generatedFromTemplate: false,
      },
    });
    await prisma.assignment.create({
      data: { shiftId: shift.id, userId: agentARow.id, status: "ASSIGNED" },
    });

    // Heures VALIDATED du mois en cours pour agentA — comptent dans le total.
    // Ancrées au 2 du mois (pas "hier") pour ne jamais déborder sur le mois
    // precedent si le test tourne un 1er.
    const inMonth = new Date(dateOnlyUTC(today.year, today.month, 2).getTime() + 6 * 3_600_000);
    const validated = await prisma.timeEntry.create({
      data: {
        userId: agentARow.id,
        siteId: site.id,
        clockInAt: inMonth,
        clockOutAt: new Date(inMonth.getTime() + 2 * 3_600_000),
        status: "VALIDATED",
      },
    });
    // Heures SUBMITTED (pas encore validées) — comptent dans pendingCount, pas dans le total.
    const submitted = await prisma.timeEntry.create({
      data: {
        userId: agentARow.id,
        siteId: site.id,
        clockInAt: new Date(Date.now() - 3 * 3_600_000),
        clockOutAt: new Date(Date.now() - 2 * 3_600_000),
        status: "SUBMITTED",
      },
    });
    // Heures VALIDATED d'un AUTRE agent le même mois — ne doit jamais apparaître pour agentA.
    const otherAgentEntry = await prisma.timeEntry.create({
      data: {
        userId: agentBRow.id,
        siteId: site.id,
        clockInAt: inMonth,
        clockOutAt: new Date(inMonth.getTime() + 5 * 3_600_000),
        status: "VALIDATED",
      },
    });

    clientId = client.id;
    siteId = site.id;
    contractId = contract.id;
    shiftId = shift.id;
    agentAId = agentARow.id;
    agentBId = agentBRow.id;
    agentA = { id: agentARow.id, email: agentARow.email, role: "AGENT", isActive: true };
    entryIds = [validated.id, submitted.id, otherAgentEntry.id];
  });

  afterAll(async () => {
    await prisma.timeEntry.deleteMany({ where: { id: { in: entryIds } } });
    await prisma.assignment.deleteMany({ where: { shiftId } });
    await prisma.shift.delete({ where: { id: shiftId } });
    await prisma.contract.delete({ where: { id: contractId } });
    await prisma.site.delete({ where: { id: siteId } });
    await prisma.client.delete({ where: { id: clientId } });
    await prisma.user.deleteMany({ where: { id: { in: [agentAId, agentBId] } } });
  });

  it("listWeekShiftsForAgent ne retourne que les shifts affectés à l'agent courant, sur la semaine ciblée", async () => {
    const { shifts } = await listWeekShiftsForAgent(agentA, 0);
    expect(shifts.map((s) => s.id)).toEqual([shiftId]);
  });

  it("listWeekShiftsForAgent renvoie une liste vide pour une autre semaine", async () => {
    const { shifts } = await listWeekShiftsForAgent(agentA, 1);
    expect(shifts).toHaveLength(0);
  });

  it("getAgentMonthlyHours ne compte que les heures VALIDATED de l'agent courant", async () => {
    const today = parisToday();
    const result = await getAgentMonthlyHours(agentA, today.year, today.month);
    expect(result.totalHours).toBe(2); // seule l'entrée VALIDATED de 2h d'agentA
    expect(result.pendingCount).toBe(1); // l'entrée SUBMITTED
    expect(result.entries).toHaveLength(1);
  });
});
