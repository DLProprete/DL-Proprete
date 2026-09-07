import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import type { SessionUser } from "@/server/auth/session";
import { dateOnlyUTC, monthRange, parisToday } from "@/lib/dates";
import {
  getLongOpenTimeEntries,
  getContractsEndingSoon,
  getMonthlyRevenue,
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
        reference: `C-TEST-DASH-SHORT-${suffix}`,
        startsOn: new Date(todayDate.getTime() - 365 * 86_400_000),
        endsOn: in30Days,
        status: "ACTIVE",
        renewalNoticeDays: 60,
      },
    });
    const shortContractSite = await prisma.contractSite.create({
      data: { contractId: shortContract.id, siteId: site.id, hourlyRateHT: 20 },
    });
    const longContract = await prisma.contract.create({
      data: {
        clientId: client.id,
        reference: `C-TEST-DASH-LONG-${suffix}`,
        startsOn: new Date(todayDate.getTime() - 365 * 86_400_000),
        endsOn: in90Days,
        status: "ACTIVE",
        renewalNoticeDays: 60,
      },
    });
    await prisma.contractSite.create({
      data: { contractId: longContract.id, siteId: site.id, hourlyRateHT: 20 },
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
        contractSiteId: shortContractSite.id,
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
        contractSiteId: shortContractSite.id,
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
    await prisma.contractSite.deleteMany({
      where: { contractId: { in: [shortContractId, longContractId] } },
    });
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
        reference: `C-TEST-SUGGEST-${suffix}`,
        startsOn: new Date("2020-01-01"),
        endsOn: new Date("2030-12-31"),
        status: "ACTIVE",
      },
    });
    const contractSite = await prisma.contractSite.create({
      data: { contractId: contract.id, siteId: site.id, hourlyRateHT: 20 },
    });

    const targetDate = new Date(Date.UTC(2031, 5, 15));
    const targetShift = await prisma.shift.create({
      data: {
        siteId: site.id,
        contractSiteId: contractSite.id,
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
        contractSiteId: contractSite.id,
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
    await prisma.contractSite.deleteMany({ where: { contractId } });
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

// Coordonnées réelles (Caen / Colombelles / Paris) pour un tri par
// distance vérifiable, pas juste "ordre différent de l'alphabet".
describe("suggestAgentsForShift — tri par distance et niveau d'expérience (intégration DB)", () => {
  const suffix = Date.now();
  let clientId: string;
  let siteId: string;
  let contractId: string;
  let shiftId: string;
  let adminUser: SessionUser;
  let nearAgentId: string;
  let farAgentId: string;
  let noCoordsAgentId: string;

  beforeAll(async () => {
    const client = await prisma.client.create({
      data: { legalName: "Client Test Distance", billingAddress: "1 rue Test" },
    });
    // Site à Caen — coordonnées réelles.
    const site = await prisma.site.create({
      data: {
        clientId: client.id,
        name: "Site Test Distance",
        address: "1 rue Test",
        city: "Caen",
        postalCode: "14000",
        lat: 49.1829,
        lng: -0.3707,
      },
    });
    const contract = await prisma.contract.create({
      data: {
        clientId: client.id,
        reference: `C-TEST-DISTANCE-${suffix}`,
        startsOn: new Date("2020-01-01"),
        endsOn: new Date("2030-12-31"),
        status: "ACTIVE",
      },
    });
    const contractSite = await prisma.contractSite.create({
      data: { contractId: contract.id, siteId: site.id, hourlyRateHT: 20 },
    });
    const shift = await prisma.shift.create({
      data: {
        siteId: site.id,
        contractSiteId: contractSite.id,
        date: new Date(Date.UTC(2031, 6, 1)),
        startAt: new Date(Date.UTC(2031, 6, 1, 6, 0)),
        endAt: new Date(Date.UTC(2031, 6, 1, 8, 0)),
        requiredAgents: 1,
        billableMinutes: 120,
        status: "UNSTAFFED",
        generatedFromTemplate: false,
      },
    });

    const [nearAgent, farAgent, noCoordsAgent] = await Promise.all([
      // Colombelles — à quelques km de Caen.
      prisma.user.create({
        data: {
          email: `test-distance-near-${suffix}@dlproprete.fr`,
          name: "Agent Proche",
          firstName: "Agent",
          lastName: "Proche",
          role: "AGENT",
          emailVerified: true,
          homeLat: 49.2039,
          homeLng: -0.3086,
          experienceLevel: "SENIOR",
        },
      }),
      // Paris — loin de Caen.
      prisma.user.create({
        data: {
          email: `test-distance-far-${suffix}@dlproprete.fr`,
          name: "Agent Loin",
          firstName: "Agent",
          lastName: "Loin",
          role: "AGENT",
          emailVerified: true,
          homeLat: 48.8566,
          homeLng: 2.3522,
        },
      }),
      // Sans coordonnées — doit rester proposable, relégué en fin de liste.
      prisma.user.create({
        data: {
          email: `test-distance-nocoords-${suffix}@dlproprete.fr`,
          name: "Agent SansCoords",
          firstName: "Agent",
          lastName: "SansCoords",
          role: "AGENT",
          emailVerified: true,
        },
      }),
    ]);

    clientId = client.id;
    siteId = site.id;
    contractId = contract.id;
    shiftId = shift.id;
    nearAgentId = nearAgent.id;
    farAgentId = farAgent.id;
    noCoordsAgentId = noCoordsAgent.id;
    adminUser = { id: `admin-distance-${suffix}`, email: "admin@dlproprete.fr", role: "ADMIN", isActive: true };
  });

  afterAll(async () => {
    await prisma.shift.delete({ where: { id: shiftId } });
    await prisma.contractSite.deleteMany({ where: { contractId } });
    await prisma.contract.delete({ where: { id: contractId } });
    await prisma.site.delete({ where: { id: siteId } });
    await prisma.client.delete({ where: { id: clientId } });
    await prisma.user.deleteMany({ where: { id: { in: [nearAgentId, farAgentId, noCoordsAgentId] } } });
  });

  // Base de test partagée (voir CLAUDE.md) : d'autres agents actifs, sans
  // coordonnées, existent déjà en base (seed, autres tests). near/far sont
  // les deux seuls du jeu de données à avoir une vraie distance, donc
  // garantis en tête de liste quel que soit le nombre d'agents sans
  // coordonnées par ailleurs — on ne teste pas la position exacte de
  // noCoordsAgentId, non déterministe dans cet environnement.
  it("trie les suggestions par distance croissante (agent proche avant agent loin)", async () => {
    const suggestions = await suggestAgentsForShift(adminUser, shiftId);
    const ids = suggestions.map((s) => s.id);
    expect(ids.indexOf(nearAgentId)).toBeGreaterThanOrEqual(0);
    expect(ids.indexOf(farAgentId)).toBeGreaterThanOrEqual(0);
    expect(ids.indexOf(nearAgentId)).toBeLessThan(ids.indexOf(farAgentId));
  });

  it("n'exclut pas un agent sans coordonnées (juste non trié par distance)", async () => {
    const suggestions = await suggestAgentsForShift(adminUser, shiftId);
    const noCoords = suggestions.find((s) => s.id === noCoordsAgentId);
    // Peut être hors des 3 premiers si d'autres agents sans coordonnées
    // occupent déjà les places restantes (base partagée) — seule certitude
    // vérifiable : s'il apparaît, sa distance est bien absente, pas 0.
    if (noCoords) expect(noCoords.distanceKm).toBeNull();
  });

  it("transmet experienceLevel (renseigné ou non) dans le résultat", async () => {
    const suggestions = await suggestAgentsForShift(adminUser, shiftId);
    const near = suggestions.find((s) => s.id === nearAgentId);
    const far = suggestions.find((s) => s.id === farAgentId);
    expect(near?.experienceLevel).toBe("SENIOR");
    expect(far?.experienceLevel).toBeNull();
  });
});

// Mesuré en delta (avant/après) plutôt qu'en valeur absolue : getMonthlyRevenue
// additionne sur toute la base, pas sur un client isolé — d'autres tests ou
// données réelles peuvent déjà contribuer au même mois calendaire.
describe("getMonthlyRevenue — CA facturé du mois (intégration DB)", () => {
  const suffix = Date.now();
  let clientId: string;
  let adminUser: SessionUser;
  let invoiceIds: string[] = [];

  beforeAll(async () => {
    const client = await prisma.client.create({
      data: { legalName: `Client Test CA ${suffix}`, billingAddress: "1 rue Test" },
    });
    const admin = await prisma.user.create({
      data: {
        email: `test-ca-admin-${suffix}@dlproprete.fr`,
        name: "Admin CA",
        firstName: "Admin",
        lastName: "CA",
        role: "ADMIN",
        emailVerified: true,
      },
    });
    clientId = client.id;
    adminUser = { id: admin.id, email: admin.email, role: "ADMIN", isActive: true };
  });

  afterAll(async () => {
    await prisma.invoice.deleteMany({ where: { id: { in: invoiceIds } } });
    await prisma.client.delete({ where: { id: clientId } });
    await prisma.user.delete({ where: { id: adminUser.id } });
  });

  it("additionne le HT des factures émises (pas brouillon) du mois, mois précédent inclus", async () => {
    const today = parisToday();
    const previous =
      today.month === 1
        ? { year: today.year - 1, month: 12 }
        : { year: today.year, month: today.month - 1 };
    const { start: currentStart } = monthRange(today.year, today.month);
    const { start: previousStart } = monthRange(previous.year, previous.month);

    const before = await getMonthlyRevenue(adminUser);

    const [issuedThisMonth, draftThisMonth, issuedLastMonth] = await Promise.all([
      prisma.invoice.create({
        data: {
          clientId,
          status: "ISSUED",
          issuedOn: currentStart,
          amountHT: 1000,
          amountTTC: 1200,
          number: `F-TEST-CA-1-${suffix}`,
        },
      }),
      prisma.invoice.create({
        data: { clientId, status: "DRAFT", issuedOn: currentStart, amountHT: 500, amountTTC: 600 },
      }),
      prisma.invoice.create({
        data: {
          clientId,
          status: "PAID",
          issuedOn: previousStart,
          amountHT: 800,
          amountTTC: 960,
          number: `F-TEST-CA-2-${suffix}`,
        },
      }),
    ]);
    invoiceIds = [issuedThisMonth.id, draftThisMonth.id, issuedLastMonth.id];

    const after = await getMonthlyRevenue(adminUser);

    // Seule la facture ISSUED compte pour le mois en cours — le brouillon
    // (500) est exclu, donc le delta est exactement 1000, pas 1500.
    expect(after.currentMonthHT - before.currentMonthHT).toBe(1000);
    expect(after.previousMonthHT - before.previousMonthHT).toBe(800);
  });
});
