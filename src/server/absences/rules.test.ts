import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import type { SessionUser } from "@/server/auth/session";
import { declareAbsence, approveAbsence, rejectAbsence, AbsenceNotPendingError } from "./actions";
import { listReplacementCandidates } from "./replacements";

// Test d'intégration : la règle "une absence approuvée libère les Shift et
// exclut les candidats en conflit" est une transition d'état multi-table,
// pas un prédicat pur. Fixtures créées et nettoyées ici.
describe("règles Absence / remplacement (intégration DB)", () => {
  const suffix = Date.now();
  let siteId: string;
  let clientId: string;
  let contractId: string;
  let shiftAId: string; // vacation de l'agent absent
  let shiftBId: string; // vacation qui chevauche shiftA dans le temps
  let adminUser: SessionUser;
  let absentAgent: SessionUser;
  let conflictingAgent: SessionUser;
  let freeAgent: SessionUser;
  let onLeaveAgent: SessionUser;

  beforeAll(async () => {
    const client = await prisma.client.create({
      data: { legalName: "Client Test Absence", billingAddress: "1 rue Test" },
    });
    const site = await prisma.site.create({
      data: {
        clientId: client.id,
        name: "Site Test Absence",
        address: "1 rue Test",
        city: "Caen",
        postalCode: "14000",
      },
    });
    const contract = await prisma.contract.create({
      data: {
        clientId: client.id,
        reference: `C-TEST-ABSENCE-${suffix}`,
        startsOn: new Date("2020-01-01"),
        endsOn: new Date("2030-12-31"),
        status: "ACTIVE",
      },
    });
    const contractSite = await prisma.contractSite.create({
      data: { contractId: contract.id, siteId: site.id, hourlyRateHT: 20 },
    });

    const day = new Date("2026-09-15T00:00:00.000Z");
    const shiftA = await prisma.shift.create({
      data: {
        siteId: site.id,
        contractSiteId: contractSite.id,
        date: day,
        startAt: new Date("2026-09-15T06:00:00.000Z"),
        endAt: new Date("2026-09-15T08:00:00.000Z"),
        requiredAgents: 1,
        billableMinutes: 120,
        status: "UNSTAFFED",
        generatedFromTemplate: false,
      },
    });
    const shiftB = await prisma.shift.create({
      data: {
        siteId: site.id,
        contractSiteId: contractSite.id,
        date: day,
        startAt: new Date("2026-09-15T07:00:00.000Z"), // chevauche shiftA
        endAt: new Date("2026-09-15T09:00:00.000Z"),
        requiredAgents: 1,
        billableMinutes: 120,
        status: "UNSTAFFED",
        generatedFromTemplate: false,
      },
    });

    async function makeUser(role: "ADMIN" | "AGENT", label: string) {
      return prisma.user.create({
        data: {
          email: `test-${label}-${suffix}@dlproprete.fr`,
          name: label,
          firstName: label,
          lastName: "Test",
          role,
          emailVerified: true,
        },
      });
    }

    const adminRow = await makeUser("ADMIN", "admin-absence");
    const absentRow = await makeUser("AGENT", "absent-agent");
    const conflictingRow = await makeUser("AGENT", "conflicting-agent");
    const freeRow = await makeUser("AGENT", "free-agent");
    const onLeaveRow = await makeUser("AGENT", "onleave-agent");

    // L'agent absent est affecté à shiftA.
    await prisma.assignment.create({
      data: { shiftId: shiftA.id, userId: absentRow.id, status: "ASSIGNED" },
    });
    // Le candidat "en conflit" est affecté à shiftB (chevauche shiftA).
    await prisma.assignment.create({
      data: { shiftId: shiftB.id, userId: conflictingRow.id, status: "ASSIGNED" },
    });
    // Le candidat "déjà en congé" a une absence APPROVED couvrant le jour de shiftA.
    await prisma.absence.create({
      data: {
        userId: onLeaveRow.id,
        type: "PAID_LEAVE",
        startsOn: day,
        endsOn: day,
        status: "APPROVED",
      },
    });

    siteId = site.id;
    clientId = client.id;
    contractId = contract.id;
    shiftAId = shiftA.id;
    shiftBId = shiftB.id;
    adminUser = { id: adminRow.id, email: adminRow.email, role: "ADMIN", isActive: true };
    absentAgent = { id: absentRow.id, email: absentRow.email, role: "AGENT", isActive: true };
    conflictingAgent = { id: conflictingRow.id, email: conflictingRow.email, role: "AGENT", isActive: true };
    freeAgent = { id: freeRow.id, email: freeRow.email, role: "AGENT", isActive: true };
    onLeaveAgent = { id: onLeaveRow.id, email: onLeaveRow.email, role: "AGENT", isActive: true };
  });

  afterAll(async () => {
    const userIds = [adminUser, absentAgent, conflictingAgent, freeAgent, onLeaveAgent].map((u) => u.id);
    await prisma.absence.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.assignment.deleteMany({ where: { shiftId: { in: [shiftAId, shiftBId] } } });
    await prisma.shift.deleteMany({ where: { id: { in: [shiftAId, shiftBId] } } });
    await prisma.contractSite.deleteMany({ where: { contractId } });
    await prisma.contract.delete({ where: { id: contractId } });
    await prisma.site.delete({ where: { id: siteId } });
    await prisma.client.delete({ where: { id: clientId } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  });

  it("un arrêt maladie sans justificatif ne peut pas être déclaré", async () => {
    await expect(
      declareAbsence(absentAgent, {
        type: "SICK",
        startsOn: "2026-09-15",
        endsOn: "2026-09-15",
      }),
    ).rejects.toThrow();
  });

  it("approbation : les Assignment ASSIGNED de la période passent REPLACED, le Shift redevient UNSTAFFED", async () => {
    const absence = await declareAbsence(absentAgent, {
      type: "SICK",
      startsOn: "2026-09-15",
      endsOn: "2026-09-15",
      documentPath: "absences/justificatif-test.pdf",
    });
    expect(absence.status).toBe("PENDING");

    const approved = await approveAbsence(adminUser, absence.id);
    expect(approved.status).toBe("APPROVED");

    const assignment = await prisma.assignment.findFirstOrThrow({
      where: { shiftId: shiftAId, userId: absentAgent.id },
    });
    expect(assignment.status).toBe("REPLACED");

    const shift = await prisma.shift.findUniqueOrThrow({ where: { id: shiftAId } });
    expect(shift.status).toBe("UNSTAFFED");
  });

  it("une absence déjà traitée ne peut pas être re-approuvée ou rejetée", async () => {
    const absence = await prisma.absence.findFirstOrThrow({
      where: { userId: absentAgent.id, status: "APPROVED" },
    });
    await expect(approveAbsence(adminUser, absence.id)).rejects.toBeInstanceOf(
      AbsenceNotPendingError,
    );
    await expect(rejectAbsence(adminUser, absence.id)).rejects.toBeInstanceOf(
      AbsenceNotPendingError,
    );
  });

  it("propose un remplaçant : exclut l'agent en conflit d'horaire et celui déjà en congé, garde l'agent libre", async () => {
    const candidates = await listReplacementCandidates(adminUser, shiftAId);
    const candidateIds = candidates.map((c) => c.id);

    expect(candidateIds).not.toContain(conflictingAgent.id);
    expect(candidateIds).not.toContain(onLeaveAgent.id);
    expect(candidateIds).not.toContain(absentAgent.id); // en congé lui-même
    expect(candidateIds).toContain(freeAgent.id);
  });
});
