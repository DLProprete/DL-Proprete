import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { ForbiddenError, type SessionUser } from "@/server/auth/session";
import { exportSalesJournalCsv } from "./sales-journal-csv";

const planner: SessionUser = {
  id: "u-planner",
  email: "planner@dlproprete.fr",
  role: "PLANNER",
  isActive: true,
};

describe("droits export CSV journal des ventes — ADMIN seulement", () => {
  it("rejette un PLANNER", async () => {
    await expect(exportSalesJournalCsv(planner, 2026, 9)).rejects.toBeInstanceOf(ForbiddenError);
  });
});

describe("export CSV du journal des ventes (intégration DB)", () => {
  const suffix = Date.now();
  const YEAR = 2033;
  const MONTH = 6;
  let clientId: string;
  let siteId: string;
  let invoiceId: string;
  let adminUser: SessionUser;

  beforeAll(async () => {
    const client = await prisma.client.create({
      data: { legalName: "Client Test Journal", billingAddress: "1 rue Test" },
    });
    const site = await prisma.site.create({
      data: {
        clientId: client.id,
        name: "Site Test Journal",
        address: "1 rue Test",
        city: "Caen",
        postalCode: "14000",
      },
    });
    const contract = await prisma.contract.create({
      data: {
        clientId: client.id,
        siteId: site.id,
        reference: `C-TEST-JOURNAL-${suffix}`,
        startsOn: new Date(Date.UTC(YEAR, 0, 1)),
        endsOn: new Date(Date.UTC(YEAR, 11, 31)),
        hourlyRateHT: 20,
        vatRate: 20,
        status: "ACTIVE",
        billingBasis: "FLAT_INDICATIVE_HOURS",
        indicativeMonthlyHours: 10,
      },
    });
    const adminRow = await prisma.user.create({
      data: {
        email: `test-journal-admin-${suffix}@dlproprete.fr`,
        name: "Admin Journal",
        firstName: "Admin",
        lastName: "Journal",
        role: "ADMIN",
        emailVerified: true,
      },
    });

    const invoice = await prisma.invoice.create({
      data: {
        clientId: client.id,
        contractId: contract.id,
        periodYear: YEAR,
        periodMonth: MONTH,
        number: `F-TEST-JOURNAL-${suffix}`,
        status: "PARTIALLY_PAID",
        issuedOn: new Date(Date.UTC(YEAR, MONTH - 1, 5)),
        amountHT: 100,
        vatAmount: 20,
        amountTTC: 120,
      },
    });
    await prisma.payment.create({
      data: {
        invoiceId: invoice.id,
        paidOn: new Date(Date.UTC(YEAR, MONTH - 1, 10)),
        amount: 50,
        method: "TRANSFER",
      },
    });

    // Brouillon du même mois : issuedOn = null, doit être exclu (le filtre
    // de date sur issuedOn l'écarte naturellement).
    await prisma.invoice.create({
      data: { clientId: client.id, contractId: contract.id, status: "DRAFT", amountHT: 0, vatAmount: 0, amountTTC: 0 },
    });

    clientId = client.id;
    siteId = site.id;
    invoiceId = invoice.id;
    adminUser = { id: adminRow.id, email: adminRow.email, role: "ADMIN", isActive: true };
  });

  afterAll(async () => {
    await prisma.payment.deleteMany({ where: { invoiceId } });
    await prisma.invoice.deleteMany({ where: { clientId } });
    await prisma.contract.deleteMany({ where: { siteId } });
    await prisma.site.delete({ where: { id: siteId } });
    await prisma.client.delete({ where: { id: clientId } });
    await prisma.user.delete({ where: { id: adminUser.id } });
  });

  it("exporte les factures émises du mois avec le bon format, en excluant les brouillons", async () => {
    const csv = await exportSalesJournalCsv(adminUser, YEAR, MONTH);
    const lines = csv.split("\r\n");

    expect(lines[0]).toBe(
      "﻿Date émission;Numéro;Client;Site;Période;HT;TVA;TTC;Statut;Payé;Restant",
    );
    expect(lines).toHaveLength(2); // en-tête + la facture émise, le brouillon est exclu
    expect(lines[1]).toContain(`F-TEST-JOURNAL-${suffix}`);
    expect(lines[1]).toContain("Site Test Journal");
    expect(lines[1]).toContain(`${String(MONTH).padStart(2, "0")}/${YEAR}`);
    expect(lines[1]).toContain("Partiellement payée");
    expect(lines[1]).toContain("100,00");
    expect(lines[1]).toContain("20,00");
    expect(lines[1]).toContain("120,00");
    expect(lines[1]).toContain("50,00"); // payé
    expect(lines[1]).toContain("70,00"); // restant
    expect(lines[1].split(";")).toHaveLength(11);
  });
});
