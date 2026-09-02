import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import type { SessionUser } from "@/server/auth/session";
import {
  startTimeEntry,
  endTimeEntry,
  TimeEntryAlreadyOpenError,
  TimeEntryNotModifiableError,
  TimeEntryTooShortError,
} from "./actions";
import { validateTimeEntry, rejectTimeEntry } from "./review";

// Test d'intégration : les règles OPEN/VALIDATED sont des transitions
// d'état en base, pas des prédicats purs. Fixtures créées et nettoyées ici,
// isolées des données de seed.
describe("règles de pointage OPEN / VALIDATED (intégration DB)", () => {
  let clientId: string;
  let siteId: string;
  let contractId: string;
  let shiftId: string;
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
    const shift = await prisma.shift.create({
      data: {
        siteId: site.id,
        contractSiteId: contractSite.id,
        date: new Date(),
        startAt: new Date(),
        endAt: new Date(Date.now() + 3_600_000),
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

    clientId = client.id;
    siteId = site.id;
    contractId = contract.id;
    shiftId = shift.id;
    agentUser = { id: agentRow.id, email: agentRow.email, role: "AGENT", isActive: true };
    adminUser = { id: adminRow.id, email: adminRow.email, role: "ADMIN", isActive: true };
  });

  afterAll(async () => {
    await prisma.auditLog.deleteMany({ where: { actorUserId: adminUser.id } });
    await prisma.timeEntry.deleteMany({ where: { userId: agentUser.id } });
    await prisma.shift.delete({ where: { id: shiftId } });
    await prisma.contractSite.deleteMany({ where: { contractId } });
    await prisma.contract.deleteMany({ where: { id: contractId } });
    await prisma.site.delete({ where: { id: siteId } });
    await prisma.client.delete({ where: { id: clientId } });
    await prisma.user.delete({ where: { id: agentUser.id } });
    await prisma.user.delete({ where: { id: adminUser.id } });
  });

  it("démarre un pointage OPEN lié au shift", async () => {
    const entry = await startTimeEntry(agentUser, shiftId);
    expect(entry.status).toBe("OPEN");
    expect(entry.shiftId).toBe(shiftId);
  });

  it("refuse un second pointage tant que le premier est OPEN", async () => {
    await expect(startTimeEntry(agentUser, shiftId)).rejects.toBeInstanceOf(
      TimeEntryAlreadyOpenError,
    );
  });

  it("termine le pointage OPEN -> passe en SUBMITTED", async () => {
    const open = await prisma.timeEntry.findFirstOrThrow({
      where: { userId: agentUser.id, status: "OPEN" },
    });
    // Durée minimale de 5 min exigée par endTimeEntry — cf. tests dédiés
    // plus bas ; ici on veut juste vérifier la transition OPEN -> SUBMITTED.
    await prisma.timeEntry.update({
      where: { id: open.id },
      data: { clockInAt: new Date(Date.now() - 6 * 60_000) },
    });
    const ended = await endTimeEntry(agentUser, open.id);
    expect(ended.status).toBe("SUBMITTED");
    expect(ended.clockOutAt).not.toBeNull();
  });

  it("un agent ne peut plus modifier une entrée VALIDATED", async () => {
    const submitted = await prisma.timeEntry.findFirstOrThrow({
      where: { userId: agentUser.id, status: "SUBMITTED" },
    });
    const validated = await validateTimeEntry(adminUser, submitted.id);
    expect(validated.status).toBe("VALIDATED");

    const auditRows = await prisma.auditLog.findMany({
      where: { action: "TIME_VALIDATED", entityType: "TimeEntry", entityId: validated.id },
    });
    expect(auditRows).toHaveLength(1);
    expect(auditRows[0].actorUserId).toBe(adminUser.id);

    await expect(endTimeEntry(agentUser, validated.id)).rejects.toBeInstanceOf(
      TimeEntryNotModifiableError,
    );
  });

  it("un pointage déjà validé ne peut pas être re-validé ou rejeté", async () => {
    const validated = await prisma.timeEntry.findFirstOrThrow({
      where: { userId: agentUser.id, status: "VALIDATED" },
    });
    await expect(validateTimeEntry(adminUser, validated.id)).rejects.toBeInstanceOf(
      TimeEntryNotModifiableError,
    );
    await expect(rejectTimeEntry(adminUser, validated.id)).rejects.toBeInstanceOf(
      TimeEntryNotModifiableError,
    );
  });

  it("une fois l'entrée validée, l'agent peut redémarrer un nouveau pointage OPEN", async () => {
    const entry = await startTimeEntry(agentUser, shiftId);
    expect(entry.status).toBe("OPEN");
  });

  it("refuse de terminer un pointage à moins de 5 min du début (double-tap)", async () => {
    // Reprend l'OPEN laissé par le test précédent : un seul OPEN à la fois
    // par agent est contraint en base (index unique partiel), donc on ne
    // peut pas en créer un second directement pour ce test.
    const open = await prisma.timeEntry.findFirstOrThrow({
      where: { userId: agentUser.id, status: "OPEN" },
    });
    await expect(endTimeEntry(agentUser, open.id)).rejects.toBeInstanceOf(TimeEntryTooShortError);
    const stillOpen = await prisma.timeEntry.findUniqueOrThrow({ where: { id: open.id } });
    expect(stillOpen.status).toBe("OPEN");
    expect(stillOpen.clockOutAt).toBeNull();
  });

  it("accepte une fin à 5 min ou plus du début", async () => {
    const open = await prisma.timeEntry.findFirstOrThrow({
      where: { userId: agentUser.id, status: "OPEN" },
    });
    await prisma.timeEntry.update({
      where: { id: open.id },
      data: { clockInAt: new Date(Date.now() - 6 * 60_000) },
    });
    const ended = await endTimeEntry(agentUser, open.id);
    expect(ended.status).toBe("SUBMITTED");
  });
});
