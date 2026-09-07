import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import type { SessionUser } from "@/server/auth/session";
import { generateDraftAssignments } from "./draft-assignments";

const adminUser: SessionUser = { id: "admin-draft-test", email: "admin@dlproprete.fr", role: "ADMIN", isActive: true };

async function makeClientSiteContract(suffix: string, lat?: number, lng?: number) {
  const client = await prisma.client.create({
    data: { legalName: `Client Draft ${suffix}`, billingAddress: "1 rue Test" },
  });
  const site = await prisma.site.create({
    data: {
      clientId: client.id,
      name: `Site Draft ${suffix}`,
      address: "1 rue Test",
      city: "Caen",
      postalCode: "14000",
      lat,
      lng,
    },
  });
  const contract = await prisma.contract.create({
    data: {
      clientId: client.id,
      reference: `C-DRAFT-${suffix}`,
      startsOn: new Date("2020-01-01"),
      endsOn: new Date("2030-12-31"),
      status: "ACTIVE",
    },
  });
  const contractSite = await prisma.contractSite.create({
    data: { contractId: contract.id, siteId: site.id, hourlyRateHT: 20 },
  });
  return { client, site, contract, contractSite };
}

describe("generateDraftAssignments — pas de double affectation dans le même lot (intégration DB)", () => {
  const suffix = `overlap-${Date.now()}`;
  let clientId: string;
  let siteId: string;
  let contractId: string;
  let shiftAId: string;
  let shiftBId: string;
  let agentId: string;

  beforeAll(async () => {
    // Coordonnées arbitraires (pas un vrai lieu, pour ne coïncider avec
    // aucune autre fixture géo du dépôt) : le site et l'agent partagent le
    // même point, distance 0 — garantit que cet agent devance tout autre
    // agent actif de la base partagée (voir CLAUDE.md), qui n'a jamais
    // exactement ces coordonnées. Sans ça, le test dépendrait de l'ordre
    // alphabétique face à des dizaines d'agents réels/autres fixtures.
    const { client, site, contract, contractSite } = await makeClientSiteContract(suffix, 1, 1);

    // Deux vacations le même jour qui se chevauchent (8h-12h et 10h-14h) :
    // un seul agent disponible, requis sur les deux — sans le suivi en
    // mémoire du lot, l'algorithme le proposerait à tort pour les deux.
    const shiftA = await prisma.shift.create({
      data: {
        siteId: site.id,
        contractSiteId: contractSite.id,
        date: new Date(Date.UTC(2031, 7, 1)),
        startAt: new Date(Date.UTC(2031, 7, 1, 8, 0)),
        endAt: new Date(Date.UTC(2031, 7, 1, 12, 0)),
        requiredAgents: 1,
        billableMinutes: 240,
        status: "UNSTAFFED",
        generatedFromTemplate: false,
      },
    });
    const shiftB = await prisma.shift.create({
      data: {
        siteId: site.id,
        contractSiteId: contractSite.id,
        date: new Date(Date.UTC(2031, 7, 1)),
        startAt: new Date(Date.UTC(2031, 7, 1, 10, 0)),
        endAt: new Date(Date.UTC(2031, 7, 1, 14, 0)),
        requiredAgents: 1,
        billableMinutes: 240,
        status: "UNSTAFFED",
        generatedFromTemplate: false,
      },
    });

    const agent = await prisma.user.create({
      data: {
        email: `test-draft-solo-${suffix}@dlproprete.fr`,
        name: "Agent Solo",
        firstName: "Agent",
        lastName: "Solo",
        role: "AGENT",
        emailVerified: true,
        homeLat: 1,
        homeLng: 1,
      },
    });

    clientId = client.id;
    siteId = site.id;
    contractId = contract.id;
    shiftAId = shiftA.id;
    shiftBId = shiftB.id;
    agentId = agent.id;
  });

  afterAll(async () => {
    await prisma.shift.deleteMany({ where: { id: { in: [shiftAId, shiftBId] } } });
    await prisma.contractSite.deleteMany({ where: { contractId } });
    await prisma.contract.delete({ where: { id: contractId } });
    await prisma.site.delete({ where: { id: siteId } });
    await prisma.client.delete({ where: { id: clientId } });
    await prisma.user.delete({ where: { id: agentId } });
  });

  it("ne propose le seul agent disponible que sur l'une des deux vacations qui se chevauchent", async () => {
    const proposals = await generateDraftAssignments(
      adminUser,
      new Date(Date.UTC(2031, 7, 1)),
      new Date(Date.UTC(2031, 7, 1)),
    );

    const proposalA = proposals.find((p) => p.shiftId === shiftAId);
    const proposalB = proposals.find((p) => p.shiftId === shiftBId);
    expect(proposalA).toBeDefined();
    expect(proposalB).toBeDefined();

    const proposedIds = [proposalA!.slots[0].proposed?.id, proposalB!.slots[0].proposed?.id];
    // L'agent est proposé une seule fois au total sur les deux vacations —
    // jamais sur les deux, jamais deux fois pour la même.
    expect(proposedIds.filter((id) => id === agentId)).toHaveLength(1);
  });
});

describe("generateDraftAssignments — contrat CDD expiré et tri par distance (intégration DB)", () => {
  const suffix = `cdd-${Date.now()}`;
  let clientId: string;
  let siteId: string;
  let contractId: string;
  let shiftId: string;
  let expiredCddAgentId: string;
  let nearAgentId: string;
  let farAgentId: string;

  beforeAll(async () => {
    // Site à Caen — coordonnées réelles (même paire que les tests
    // suggestAgentsForShift, src/server/dashboard/rules.test.ts).
    const { client, site, contract, contractSite } = await makeClientSiteContract(suffix, 49.1829, -0.3707);

    const shift = await prisma.shift.create({
      data: {
        siteId: site.id,
        contractSiteId: contractSite.id,
        date: new Date(Date.UTC(2031, 7, 15)),
        startAt: new Date(Date.UTC(2031, 7, 15, 8, 0)),
        endAt: new Date(Date.UTC(2031, 7, 15, 12, 0)),
        requiredAgents: 1,
        billableMinutes: 240,
        status: "UNSTAFFED",
        generatedFromTemplate: false,
      },
    });

    const [expiredCddAgent, nearAgent, farAgent] = await Promise.all([
      prisma.user.create({
        data: {
          email: `test-draft-cdd-${suffix}@dlproprete.fr`,
          name: "Agent CDD Expire",
          firstName: "Agent",
          lastName: "CDDExpire",
          role: "AGENT",
          emailVerified: true,
          contractType: "CDD",
          contractEndDate: new Date(Date.UTC(2031, 6, 1)), // avant la vacation du 15/08
          homeLat: 49.1829,
          homeLng: -0.3707,
        },
      }),
      prisma.user.create({
        data: {
          email: `test-draft-near-${suffix}@dlproprete.fr`,
          name: "Agent Proche",
          firstName: "Agent",
          lastName: "Proche",
          role: "AGENT",
          emailVerified: true,
          homeLat: 49.2039, // Colombelles
          homeLng: -0.3086,
        },
      }),
      prisma.user.create({
        data: {
          email: `test-draft-far-${suffix}@dlproprete.fr`,
          name: "Agent Loin",
          firstName: "Agent",
          lastName: "Loin",
          role: "AGENT",
          emailVerified: true,
          homeLat: 48.8566, // Paris
          homeLng: 2.3522,
        },
      }),
    ]);

    clientId = client.id;
    siteId = site.id;
    contractId = contract.id;
    shiftId = shift.id;
    expiredCddAgentId = expiredCddAgent.id;
    nearAgentId = nearAgent.id;
    farAgentId = farAgent.id;
  });

  afterAll(async () => {
    await prisma.shift.delete({ where: { id: shiftId } });
    await prisma.contractSite.deleteMany({ where: { contractId } });
    await prisma.contract.delete({ where: { id: contractId } });
    await prisma.site.delete({ where: { id: siteId } });
    await prisma.client.delete({ where: { id: clientId } });
    await prisma.user.deleteMany({ where: { id: { in: [expiredCddAgentId, nearAgentId, farAgentId] } } });
  });

  it("ne propose jamais un agent dont le CDD est terminé avant la vacation", async () => {
    const proposals = await generateDraftAssignments(
      adminUser,
      new Date(Date.UTC(2031, 7, 15)),
      new Date(Date.UTC(2031, 7, 15)),
    );
    const proposal = proposals.find((p) => p.shiftId === shiftId);
    expect(proposal).toBeDefined();
    const allCandidateIds = [
      proposal!.slots[0].proposed?.id,
      ...proposal!.slots[0].alternatives.map((a) => a.id),
    ];
    expect(allCandidateIds).not.toContain(expiredCddAgentId);
  });

  // Base de test partagée (voir CLAUDE.md) : d'autres agents actifs
  // peuvent exister par ailleurs — on vérifie l'ordre relatif entre nos
  // deux agents, pas la position exacte dans la liste complète.
  it("propose l'agent le plus proche du site avant l'agent le plus loin", async () => {
    const proposals = await generateDraftAssignments(
      adminUser,
      new Date(Date.UTC(2031, 7, 15)),
      new Date(Date.UTC(2031, 7, 15)),
    );
    const proposal = proposals.find((p) => p.shiftId === shiftId);
    const ordered = [proposal!.slots[0].proposed, ...proposal!.slots[0].alternatives].map((c) => c?.id);
    expect(ordered.indexOf(nearAgentId)).toBeGreaterThanOrEqual(0);
    expect(ordered.indexOf(farAgentId)).toBeGreaterThanOrEqual(0);
    expect(ordered.indexOf(nearAgentId)).toBeLessThan(ordered.indexOf(farAgentId));
  });
});
