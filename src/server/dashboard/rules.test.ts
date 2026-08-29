import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import type { SessionUser } from "@/server/auth/session";
import { dateOnlyUTC, parisToday } from "@/lib/dates";
import { getLongOpenTimeEntries, getContractsEndingSoon, getUnstaffedShiftsTodayTomorrow } from "./queries";

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
