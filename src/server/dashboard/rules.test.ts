import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import type { SessionUser } from "@/server/auth/session";
import { dateOnlyUTC, parisToday } from "@/lib/dates";
import {
  getLongOpenTimeEntries,
  getContractsEndingSoon,
  getUnstaffedShiftsTodayTomorrow,
  suggestAgentsForShift,
} from "./queries";

// Test d'intégration : les seuils (12h, délai de préavis par contrat,
// fenêtre J/J+1) dépendent de l'heure/date réelles, pas des prédicats purs.
describe("règles Dashboard (intégration DB)", () => {
  const suffix = Date.now();
  let clientId: string;
  let shortContractId: string; // finit dans 30j, notice 60j -> doit apparaître
  let longContractId: string; // finit dans 90j, notice 60j -> ne doit pas apparaître
  let siteForShiftId: string;
  let adminUser: SessionUser;
  let agentIds: string[];
  let recentEntryId: string;
  let staleEntryId: string;
  let todayShiftId: string;
  let farShiftId: string;

  beforeAll(async () => {
    const client = await prisma.client.create({
      data: { legalName: "Client Test Dashboard", billingAddress: "1 rue Test" },
    });
    const site = await prisma.site.create({
      data: {
        clientId: client.id,
        name: "Site Test Dashboard",
        address: "1 rue Test",
        city: "Caen",
        postalCode: "14000",
      },
    });

    const today = parisToday();
    const todayDate = dateOnlyUTC(today.year, today.month, today.day);
    const in30Days = new Date(todayDate.getTime() + 30 * 86_400_000);
    const in90Days = new Date(todayDate.getTime() + 90 * 86_400_000);

    const shortContract = await prisma.contract.create({
      data: {
        clientId: client.id,
        siteId: site.id,
        reference: `C-TEST-DASH-SHORT-${suffix}`,
        startsOn: new Date(todayDate.getTime() - 365 * 86_400_000),
        endsOn: in30Days,
        hourlyRateHT: 20,
        status: "ACTIVE",
        renewalNoticeDays: 60,
      },
    });
    const longContract = await prisma.contract.create({
      data: {
        clientId: client.id,
        siteId: site.id,
        reference: `C-TEST-DASH-LONG-${suffix}`,
        startsOn: new Date(todayDate.getTime() - 365 * 86_400_000),
        endsOn: in90Days,
        hourlyRateHT: 20,
        status: "ACTIVE",
        renewalNoticeDays: 60,
      },
    });

    // Deux agents distincts : la contrainte "un seul TimeEntry OPEN par
    // agent" (Session 5) interdit deux OPEN pour le même agent.
    const agentRecent = await prisma.user.create({
      data: {
        email: `test-dashboard-agent-recent-${suffix}@dlproprete.fr`,
        name: "Agent Dashboard Recent",
        firstName: "Agent",
        lastName: "Recent",
        role: "AGENT",
        emailVerified: true,
      },
    });
    const agentStale = await prisma.user.create({
      data: {
        email: `test-dashboard-agent-stale-${suffix}@dlproprete.fr`,
        name: "Agent Dashboard Stale",
        firstName: "Agent",
        lastName: "Stale",
        role: "AGENT",
        emailVerified: true,
      },
    });
    const recentEntry = await prisma.timeEntry.create({
      data: {
        userId: agentRecent.id,
        siteId: site.id,
        clockInAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
        status: "OPEN",
      },
    });
    const staleEntry = await prisma.timeEntry.create({
      data: {
        userId: agentStale.id,
        siteId: site.id,
        clockInAt: new Date(Date.now() - 14 * 60 * 60 * 1000),
        status: "OPEN",
      },
    });

    const todayShift = await prisma.shift.create({
      data: {
        siteId: site.id,
        contractId: shortContract.id,
        date: todayDate,
        startAt: new Date(),
        endAt: new Date(Date.now() + 3_600_000),
        requiredAgents: 1,
        billableMinutes: 120,
        status: "UNSTAFFED",
        generatedFromTemplate: false,
      },
    });
    const farShift = await prisma.shift.create({
      data: {
        siteId: site.id,
        contractId: shortContract.id,
        date: new Date(todayDate.getTime() + 5 * 86_400_000),
        startAt: new Date(Date.now() + 5 * 86_400_000),
        endAt: new Date(Date.now() + 5 * 86_400_000 + 3_600_000),
        requiredAgents: 1,
        billableMinutes: 120,
        status: "UNSTAFFED",
        generatedFromTemplate: false,
      },
    });

    const adminRow = await prisma.user.create({
      data: {
        email: `test-dashboard-admin-${suffix}@dlproprete.fr`,
        name: "Admin Dashboard",
        firstName: "Admin",
        lastName: "Dashboard",
        role: "ADMIN",
        emailVerified: true,
      },
    });

    clientId = client.id;
    siteForShiftId = site.id;
    shortContractId = shortContract.id;
    longContractId = longContract.id;
    agentIds = [agentRecent.id, agentStale.id];
    recentEntryId = recentEntry.id;
    staleEntryId = staleEntry.id;
    todayShiftId = todayShift.id;
    farShiftId = farShift.id;
    adminUser = { id: adminRow.id, email: adminRow.email, role: "ADMIN", isActive: true };
  });

  afterAll(async () => {
    await prisma.timeEntry.deleteMany({ where: { id: { in: [recentEntryId, staleEntryId] } } });
    await prisma.shift.deleteMany({ where: { id: { in: [todayShiftId, farShiftId] } } });
    await prisma.contract.deleteMany({ where: { id: { in: [shortContractId, longContractId] } } });
    await prisma.site.delete({ where: { id: siteForShiftId } });
    await prisma.client.delete({ where: { id: clientId } });
    await prisma.user.deleteMany({ where: { id: { in: [...agentIds, adminUser.id] } } });
  });

  it("ne remonte que les pointages OPEN de plus de 12h", async () => {
    const entries = await getLongOpenTimeEntries(adminUser);
    const ids = entries.map((e) => e.id);
    expect(ids).toContain(staleEntryId);
    expect(ids).not.toContain(recentEntryId);
  });

  it("ne remonte que les contrats qui finissent sous leur délai de préavis", async () => {
    const contracts = await getContractsEndingSoon(adminUser);
    const ids = contracts.map((c) => c.id);
    expect(ids).toContain(shortContractId);
    expect(ids).not.toContain(longContractId);
  });

  it("ne remonte que les vacations non pourvues de J et J+1", async () => {
    const shifts = await getUnstaffedShiftsTodayTomorrow(adminUser);
    const ids = shifts.map((s) => s.id);
    expect(ids).toContain(todayShiftId);
    expect(ids).not.toContain(farShiftId);
  });
});

// Test dédié : l'audit du 31/08/2026 (Mo4) notait que la détection de
// chevauchement (§6 de la spec) n'avait pas pu être vérifiée faute de
// créneaux qui se chevauchent dans le seed. Fixtures dédiées ici.
describe("suggestAgentsForShift — disponibilité réelle (intégration DB)", () => {
  const suffix = Date.now();
  let clientId: string;
  let siteId: string;
  let contractId: string;
  let targetShiftId: string;
  let adminUser: SessionUser;
  let freeAgentId: string;
  let busyAgentId: string;
  let absentAgentId: string;
  let overlappingShiftId: string;
  let absenceId: string;

  beforeAll(async () => {
    const client = await prisma.client.create({
      data: { legalName: "Client Test Suggestions", billingAddress: "1 rue Test" },
    });
    const site = await prisma.site.create({
      data: { clientId: client.id, name: "Site Test Suggestions", address: "1 rue Test", city: "Caen", postalCode: "14000" },
    });
    const contract = await prisma.contract.create({
      data: {
        clientId: client.id,
        siteId: site.id,
        reference: `C-TEST-SUGGEST-${suffix}`,
        startsOn: new Date("2020-01-01"),
        endsOn: new Date("2030-12-31"),
        hourlyRateHT: 20,
        status: "ACTIVE",
      },
    });

    const targetDate = new Date(Date.UTC(2031, 5, 15));
    const targetShift = await prisma.shift.create({
      data: {
        siteId: site.id,
        contractId: contract.id,
        date: targetDate,
        startAt: new Date(Date.UTC(2031, 5, 15, 6, 0)),
        endAt: new Date(Date.UTC(2031, 5, 15, 8, 0)),
        requiredAgents: 1,
        billableMinutes: 120,
        status: "UNSTAFFED",
        generatedFromTemplate: false,
      },
    });

    // Un shift chevauchant, déjà affecté à busyAgent — doit l'exclure.
    const overlappingShift = await prisma.shift.create({
      data: {
        siteId: site.id,
        contractId: contract.id,
        date: targetDate,
        startAt: new Date(Date.UTC(2031, 5, 15, 7, 0)),
        endAt: new Date(Date.UTC(2031, 5, 15, 9, 0)),
        requiredAgents: 1,
        billableMinutes: 120,
        status: "PLANNED",
        generatedFromTemplate: false,
      },
    });

    const [freeAgent, busyAgent, absentAgent, admin] = await Promise.all([
      prisma.user.create({
        data: {
          email: `test-suggest-free-${suffix}@dlproprete.fr`,
          name: "Agent Libre",
          firstName: "Agent",
          lastName: "Libre",
          role: "AGENT",
          emailVerified: true,
        },
      }),
      prisma.user.create({
        data: {
          email: `test-suggest-busy-${suffix}@dlproprete.fr`,
          name: "Agent Occupe",
          firstName: "Agent",
          lastName: "Occupe",
          role: "AGENT",
          emailVerified: true,
        },
      }),
      prisma.user.create({
        data: {
          email: `test-suggest-absent-${suffix}@dlproprete.fr`,
          name: "Agent Absent",
          firstName: "Agent",
          lastName: "Absent",
          role: "AGENT",
          emailVerified: true,
        },
      }),
      prisma.user.create({
        data: {
          email: `test-suggest-admin-${suffix}@dlproprete.fr`,
          name: "Admin Suggestions",
          firstName: "Admin",
          lastName: "Suggestions",
          role: "ADMIN",
          emailVerified: true,
        },
      }),
    ]);

    await prisma.assignment.create({
      data: { shiftId: overlappingShift.id, userId: busyAgent.id, status: "ASSIGNED" },
    });
    const absence = await prisma.absence.create({
      data: {
        userId: absentAgent.id,
        type: "PAID_LEAVE",
        startsOn: new Date(Date.UTC(2031, 5, 10)),
        endsOn: new Date(Date.UTC(2031, 5, 20)),
        status: "APPROVED",
      },
    });

    clientId = client.id;
    siteId = site.id;
    contractId = contract.id;
    targetShiftId = targetShift.id;
    overlappingShiftId = overlappingShift.id;
    freeAgentId = freeAgent.id;
    busyAgentId = busyAgent.id;
    absentAgentId = absentAgent.id;
    absenceId = absence.id;
    adminUser = { id: admin.id, email: admin.email, role: "ADMIN", isActive: true };
  });

  afterAll(async () => {
    await prisma.absence.delete({ where: { id: absenceId } });
    await prisma.assignment.deleteMany({ where: { shiftId: overlappingShiftId } });
    await prisma.shift.deleteMany({ where: { id: { in: [targetShiftId, overlappingShiftId] } } });
    await prisma.contract.delete({ where: { id: contractId } });
    await prisma.site.delete({ where: { id: siteId } });
    await prisma.client.delete({ where: { id: clientId } });
    await prisma.user.deleteMany({ where: { id: { in: [freeAgentId, busyAgentId, absentAgentId, adminUser.id] } } });
  });

  it("exclut un agent déjà affecté sur un créneau qui chevauche", async () => {
    const suggestions = await suggestAgentsForShift(adminUser, targetShiftId);
    expect(suggestions.map((s) => s.id)).not.toContain(busyAgentId);
  });

  it("exclut un agent en absence approuvée ce jour-là", async () => {
    const suggestions = await suggestAgentsForShift(adminUser, targetShiftId);
    expect(suggestions.map((s) => s.id)).not.toContain(absentAgentId);
  });

  it("propose un agent libre, sans conflit ni absence", async () => {
    const suggestions = await suggestAgentsForShift(adminUser, targetShiftId);
    expect(suggestions.map((s) => s.id)).toContain(freeAgentId);
  });
});
