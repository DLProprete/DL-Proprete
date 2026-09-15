import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import type { SessionUser } from "@/server/auth/session";
import {
  completeTimeEntry,
  TimeEntryAlreadyExistsError,
  TimeEntryNotModifiableError,
  NotAssignedError,
} from "./actions";
import { validateTimeEntry, rejectTimeEntry } from "./review";

// Test d'intégration : les transitions SUBMITTED/VALIDATED sont un vrai
// changement d'état en base, pas un prédicat pur. Fixtures créées et
// nettoyées ici, isolées des données de seed.
describe("règles de pointage — un seul geste 'Terminer' (intégration DB)", () => {
  let clientId: string;
  let siteId: string;
  let contractId: string;
  let shiftId: string;
  let unassignedShiftId: string;
  let shiftStartAt: Date;
  let agentUser: SessionUser;
  let adminUser: SessionUser;

  beforeAll(async () => {
    const suffix = Date.now();
    const client = await prisma.client.create({
      data: { legalName: "Client Test Pointage", billingAddress: "1 rue Test" },
    });
    const site = await prisma.site.create({
      data: {
        clientId: client.id,
        name: "Site Test Pointage",
        address: "1 rue Test",
        city: "Caen",
        postalCode: "14000",
      },
    });
    const contract = await prisma.contract.create({
      data: {
        clientId: client.id,
        reference: `C-TEST-POINTAGE-${suffix}`,
        startsOn: new Date("2020-01-01"),
        endsOn: new Date("2030-12-31"),
        status: "ACTIVE",
      },
    });
    const contractSite = await prisma.contractSite.create({
      data: { contractId: contract.id, siteId: site.id, hourlyRateHT: 20 },
    });
    const startAt = new Date();
    const shift = await prisma.shift.create({
      data: {
        siteId: site.id,
        contractSiteId: contractSite.id,
        date: new Date(),
        startAt,
        endAt: new Date(startAt.getTime() + 3_600_000),
        requiredAgents: 1,
        billableMinutes: 120,
        status: "PLANNED",
        generatedFromTemplate: false,
      },
    });
    // Deuxième vacation, sans affectation pour l'agent de test — sert à
    // vérifier qu'un pointage y est refusé (correction du 15/09).
    const unassignedShift = await prisma.shift.create({
      data: {
        siteId: site.id,
        contractSiteId: contractSite.id,
        date: new Date(),
        startAt,
        endAt: new Date(startAt.getTime() + 3_600_000),
        requiredAgents: 1,
        billableMinutes: 120,
        status: "PLANNED",
        generatedFromTemplate: false,
      },
    });
    const agentRow = await prisma.user.create({
      data: {
        email: `test-agent-pointage-${suffix}@dlproprete.fr`,
        name: "Agent Test",
        firstName: "Agent",
        lastName: "Test",
        role: "AGENT",
        emailVerified: true,
      },
    });
    const adminRow = await prisma.user.create({
      data: {
        email: `test-admin-pointage-${suffix}@dlproprete.fr`,
        name: "Admin Test",
        firstName: "Admin",
        lastName: "Test",
        role: "ADMIN",
        emailVerified: true,
      },
    });

    await prisma.assignment.create({
      data: { shiftId: shift.id, userId: agentRow.id, status: "ASSIGNED" },
    });

    clientId = client.id;
    siteId = site.id;
    contractId = contract.id;
    shiftId = shift.id;
    unassignedShiftId = unassignedShift.id;
    shiftStartAt = startAt;
    agentUser = { id: agentRow.id, email: agentRow.email, role: "AGENT", isActive: true };
    adminUser = { id: adminRow.id, email: adminRow.email, role: "ADMIN", isActive: true };
  });

  afterAll(async () => {
    await prisma.auditLog.deleteMany({ where: { actorUserId: adminUser.id } });
    await prisma.timeEntry.deleteMany({ where: { userId: agentUser.id } });
    await prisma.assignment.deleteMany({ where: { userId: agentUser.id } });
    await prisma.shift.delete({ where: { id: shiftId } });
    await prisma.shift.delete({ where: { id: unassignedShiftId } });
    await prisma.contractSite.deleteMany({ where: { contractId } });
    await prisma.contract.deleteMany({ where: { id: contractId } });
    await prisma.site.delete({ where: { id: siteId } });
    await prisma.client.delete({ where: { id: clientId } });
    await prisma.user.delete({ where: { id: agentUser.id } });
    await prisma.user.delete({ where: { id: adminUser.id } });
  });

  it("refuse de pointer une vacation à laquelle l'agent n'est pas affecté", async () => {
    await expect(completeTimeEntry(agentUser, unassignedShiftId)).rejects.toBeInstanceOf(
      NotAssignedError,
    );
  });

  it("Terminer crée directement un pointage SUBMITTED, avec la remarque et l'heure prévue du shift", async () => {
    const before = Date.now();
    const entry = await completeTimeEntry(agentUser, shiftId, "RAS, tout est fait");
    expect(entry.status).toBe("SUBMITTED");
    expect(entry.shiftId).toBe(shiftId);
    expect(entry.clockInAt.getTime()).toBe(shiftStartAt.getTime());
    expect(entry.clockOutAt).not.toBeNull();
    expect(entry.clockOutAt!.getTime()).toBeGreaterThanOrEqual(before);
    expect(entry.note).toBe("RAS, tout est fait");
  });

  it("refuse un second pointage sur la même vacation (idempotence)", async () => {
    await expect(completeTimeEntry(agentUser, shiftId)).rejects.toBeInstanceOf(
      TimeEntryAlreadyExistsError,
    );
  });

  it("valide le pointage soumis -> passe en VALIDATED, journalisé", async () => {
    const submitted = await prisma.timeEntry.findFirstOrThrow({
      where: { userId: agentUser.id, shiftId },
    });
    const validated = await validateTimeEntry(adminUser, submitted.id);
    expect(validated.status).toBe("VALIDATED");

    const auditRows = await prisma.auditLog.findMany({
      where: { action: "TIME_VALIDATED", entityType: "TimeEntry", entityId: validated.id },
    });
    expect(auditRows).toHaveLength(1);
    expect(auditRows[0].actorUserId).toBe(adminUser.id);
  });

  it("un pointage déjà validé ne peut pas être re-validé ou rejeté", async () => {
    const validated = await prisma.timeEntry.findFirstOrThrow({
      where: { userId: agentUser.id, shiftId },
    });
    await expect(validateTimeEntry(adminUser, validated.id)).rejects.toBeInstanceOf(
      TimeEntryNotModifiableError,
    );
    await expect(rejectTimeEntry(adminUser, validated.id)).rejects.toBeInstanceOf(
      TimeEntryNotModifiableError,
    );
  });
});
