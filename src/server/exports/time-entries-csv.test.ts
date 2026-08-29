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

    // Dans le mois cible, VALIDATED -> doit apparaître.
    await prisma.timeEntry.create({
      data: {
        userId: agent.id,
        siteId: site.id,
        clockInAt: new Date(Date.UTC(YEAR, MONTH - 1, 5, 6, 0)),
        clockOutAt: new Date(Date.UTC(YEAR, MONTH - 1, 5, 8, 30)),
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
    agentId = agent.id;
    adminUser = { id: adminRow.id, email: adminRow.email, role: "ADMIN", isActive: true };
  });

  afterAll(async () => {
    await prisma.timeEntry.deleteMany({ where: { siteId } });
    await prisma.site.delete({ where: { id: siteId } });
    await prisma.client.delete({ where: { id: clientId } });
    await prisma.user.deleteMany({ where: { id: { in: [agentId, adminUser.id] } } });
  });

  it("n'inclut que les pointages VALIDATED du mois demandé, avec le bon format", async () => {
    const csv = await exportValidatedTimeEntriesCsv(adminUser, YEAR, MONTH);
    const lines = csv.split("\r\n");

    expect(lines[0]).toBe("﻿Agent;Site;Début;Fin;Durée (h)");
    expect(lines).toHaveLength(2); // en-tête + 1 ligne
    expect(lines[1]).toContain("Marie Export");
    expect(lines[1]).toContain("Site Test Export");
    expect(lines[1]).toContain("2,50"); // 06:00-08:30 = 2h30, virgule décimale
    expect(lines[1].split(";")).toHaveLength(5);
  });
});
