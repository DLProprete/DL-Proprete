import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { ForbiddenError, type SessionUser } from "@/server/auth/session";
import { exportValidatedTimeEntriesCsv } from "./time-entries-csv";

const planner: SessionUser = {
  id: "u-planner",
  email: "planner@dlproprete.fr",
  role: "PLANNER",
  isActive: true,
};

describe("droits export CSV — ADMIN seulement", () => {
  it("rejette un PLANNER", async () => {
    await expect(exportValidatedTimeEntriesCsv(planner, 2026, 9)).rejects.toBeInstanceOf(
      ForbiddenError,
    );
  });
});

describe("export CSV des pointages validés (intégration DB)", () => {
  const suffix = Date.now();
  const YEAR = 2032;
  const MONTH = 5;
  let clientId: string;
  let siteId: string;
  let contractId: string;
  let shiftId: string;
  let agentId: string;
  let adminUser: SessionUser;

  beforeAll(async () => {
    const client = await prisma.client.create({
      data: { legalName: "Client Test Export", billingAddress: "1 rue Test" },
    });
    const site = await prisma.site.create({
      data: {
        clientId: client.id,
        name: "Site Test Export",
        address: "1 rue Test",
        city: "Caen",
        postalCode: "14000",
      },
    });
    const agent = await prisma.user.create({
      data: {
        email: `test-export-agent-${suffix}@dlproprete.fr`,
        name: "Marie Export",
        firstName: "Marie",
        lastName: "Export",
        role: "AGENT",
        emailVerified: true,
      },
    });
    const adminRow = await prisma.user.create({
      data: {
        email: `test-export-admin-${suffix}@dlproprete.fr`,
        name: "Admin Export",
        firstName: "Admin",
        lastName: "Export",
        role: "ADMIN",
        emailVerified: true,
      },
    });
    const contract = await prisma.contract.create({
      data: {
        clientId: client.id,
        reference: `C-TEST-EXPORT-${suffix}`,
        startsOn: new Date("2020-01-01"),
        endsOn: new Date("2040-12-31"),
        status: "ACTIVE",
      },
    });
    const contractSite = await prisma.contractSite.create({
      data: { contractId: contract.id, siteId: site.id, hourlyRateHT: 20 },
    });
    // Vacation de 2h planifiées (06:00-08:00) — le pointage lié ci-dessous
    // est "terminé" à 08:30, un écart volontaire pour vérifier que le CSV
    // retient la durée PLANIFIÉE (2h), pas la durée mesurée (2h30).
    const shift = await prisma.shift.create({
      data: {
        siteId: site.id,
        contractSiteId: contractSite.id,
        date: new Date(Date.UTC(YEAR, MONTH - 1, 5)),
        startAt: new Date(Date.UTC(YEAR, MONTH - 1, 5, 6, 0)),
        endAt: new Date(Date.UTC(YEAR, MONTH - 1, 5, 8, 0)),
        requiredAgents: 1,
        billableMinutes: 120,
        status: "PLANNED",
        generatedFromTemplate: false,
      },
    });

    // Dans le mois cible, VALIDATED, liée à la vacation -> doit apparaître
    // avec la durée planifiée (2h), pas mesurée (2h30).
    await prisma.timeEntry.create({
      data: {
        userId: agent.id,
        siteId: site.id,
        shiftId: shift.id,
        clockInAt: new Date(Date.UTC(YEAR, MONTH - 1, 5, 6, 0)),
        clockOutAt: new Date(Date.UTC(YEAR, MONTH - 1, 5, 8, 30)),
        status: "VALIDATED",
      },
    });
    // Dans le mois cible, VALIDATED, hors planning (pas de shift) -> doit
    // apparaître avec la durée mesurée, seule disponible dans ce cas.
    await prisma.timeEntry.create({
      data: {
        userId: agent.id,
        siteId: site.id,
        clockInAt: new Date(Date.UTC(YEAR, MONTH - 1, 7, 6, 0)),
        clockOutAt: new Date(Date.UTC(YEAR, MONTH - 1, 7, 7, 0)),
        status: "VALIDATED",
      },
    });
    // Dans le mois cible, mais SUBMITTED -> ne doit pas apparaître.
    await prisma.timeEntry.create({
      data: {
        userId: agent.id,
        siteId: site.id,
        clockInAt: new Date(Date.UTC(YEAR, MONTH - 1, 6, 6, 0)),
        clockOutAt: new Date(Date.UTC(YEAR, MONTH - 1, 6, 8, 0)),
        status: "SUBMITTED",
      },
    });
    // VALIDATED mais hors du mois cible -> ne doit pas apparaître.
    await prisma.timeEntry.create({
      data: {
        userId: agent.id,
        siteId: site.id,
        clockInAt: new Date(Date.UTC(YEAR, MONTH, 5, 6, 0)),
        clockOutAt: new Date(Date.UTC(YEAR, MONTH, 5, 8, 0)),
        status: "VALIDATED",
      },
    });

    clientId = client.id;
    siteId = site.id;
    contractId = contract.id;
    shiftId = shift.id;
    agentId = agent.id;
    adminUser = { id: adminRow.id, email: adminRow.email, role: "ADMIN", isActive: true };
  });

  afterAll(async () => {
    await prisma.timeEntry.deleteMany({ where: { siteId } });
    await prisma.shift.delete({ where: { id: shiftId } });
    await prisma.contractSite.deleteMany({ where: { contractId } });
    await prisma.contract.delete({ where: { id: contractId } });
    await prisma.site.delete({ where: { id: siteId } });
    await prisma.client.delete({ where: { id: clientId } });
    await prisma.user.deleteMany({ where: { id: { in: [agentId, adminUser.id] } } });
  });

  it("n'inclut que les pointages VALIDATED du mois demandé, avec le bon format", async () => {
    const csv = await exportValidatedTimeEntriesCsv(adminUser, YEAR, MONTH);
    const lines = csv.split("\r\n");

    expect(lines[0]).toBe("﻿Agent;Site;Date;Créneau prévu;Soumis le;Durée (h)");
    expect(lines).toHaveLength(3); // en-tête + 2 lignes (liée + hors planning)

    const dataRows = lines.slice(1);
    const horsPlanningRow = dataRows.find((line) => line.includes("hors planning"));
    const shiftLinkedRow = dataRows.find((line) => line !== horsPlanningRow);

    expect(shiftLinkedRow).toBeDefined();
    expect(shiftLinkedRow).toContain("Marie Export");
    expect(shiftLinkedRow).toContain("2,00"); // durée PLANIFIÉE (2h), pas mesurée (2h30)
    expect(shiftLinkedRow!.split(";")).toHaveLength(6);

    expect(horsPlanningRow).toBeDefined();
    expect(horsPlanningRow).toContain("1,00"); // 06:00-07:00 mesuré, seule donnée disponible
  });
});
