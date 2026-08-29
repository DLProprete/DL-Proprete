import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import type { SessionUser } from "@/server/auth/session";
import { generateMonthlyInvoices } from "./generate-invoices";
import {
  addAdhocLine,
  issueInvoice,
  recordPayment,
  InvoiceNotDraftError,
  InvoiceNotIssuedError,
} from "./actions";
import { getValidatedHoursForContractMonth } from "./queries";

// Test d'intégration : la facturation est une chaîne d'états multi-table
// (Shift -> Invoice/InvoiceLine -> Payment), pas des prédicats purs.
// Fixtures créées et nettoyées ici, isolées du reste (année 2031 pour ne
// jamais entrer en conflit avec de vraies données de démo).
describe("règles Facturation (intégration DB)", () => {
  const suffix = Date.now();
  const YEAR = 2031;
  const MONTH = 3;
  let clientId: string;
  let siteId: string;
  let calendarContractId: string;
  let flatContractId: string;
  let adminUser: SessionUser;

  beforeAll(async () => {
    const client = await prisma.client.create({
      data: {
        legalName: "Client Test Facturation",
        billingAddress: "1 rue Test",
        paymentTermDays: 30,
      },
    });
    const site = await prisma.site.create({
      data: {
        clientId: client.id,
        name: "Site Test Facturation",
        address: "1 rue Test",
        city: "Caen",
        postalCode: "14000",
      },
    });
    const calendarContract = await prisma.contract.create({
      data: {
        clientId: client.id,
        siteId: site.id,
        reference: `C-TEST-BILLING-CAL-${suffix}`,
        startsOn: new Date(Date.UTC(YEAR, 0, 1)),
        endsOn: new Date(Date.UTC(YEAR, 11, 31)),
        hourlyRateHT: 20,
        vatRate: 20,
        status: "ACTIVE",
        billingBasis: "CALENDAR_SHIFTS",
      },
    });
    const flatContract = await prisma.contract.create({
      data: {
        clientId: client.id,
        siteId: site.id,
        reference: `C-TEST-BILLING-FLAT-${suffix}`,
        startsOn: new Date(Date.UTC(YEAR, 0, 1)),
        endsOn: new Date(Date.UTC(YEAR, 11, 31)),
        hourlyRateHT: 15,
        vatRate: 20,
        status: "ACTIVE",
        billingBasis: "FLAT_INDICATIVE_HOURS",
        indicativeMonthlyHours: 80,
      },
    });

    // 3 vacations de 2h (non annulées) + 1 de 5h ANNULÉE, dans le mois cible.
    for (let day = 1; day <= 3; day++) {
      await prisma.shift.create({
        data: {
          siteId: site.id,
          contractId: calendarContract.id,
          date: new Date(Date.UTC(YEAR, MONTH - 1, day)),
          startAt: new Date(Date.UTC(YEAR, MONTH - 1, day, 6, 0)),
          endAt: new Date(Date.UTC(YEAR, MONTH - 1, day, 8, 0)),
          requiredAgents: 1,
          status: "PLANNED",
          generatedFromTemplate: false,
        },
      });
    }
    await prisma.shift.create({
      data: {
        siteId: site.id,
        contractId: calendarContract.id,
        date: new Date(Date.UTC(YEAR, MONTH - 1, 10)),
        startAt: new Date(Date.UTC(YEAR, MONTH - 1, 10, 6, 0)),
        endAt: new Date(Date.UTC(YEAR, MONTH - 1, 10, 11, 0)),
        requiredAgents: 1,
        status: "CANCELLED",
        generatedFromTemplate: false,
      },
    });

    // Un pointage validé du mois, pour le contrôle en lecture seule — ne
    // doit jamais influencer le montant facturé.
    const controlAgent = await prisma.user.create({
      data: {
        email: `test-billing-agent-${suffix}@dlproprete.fr`,
        name: "Agent Facturation",
        firstName: "Agent",
        lastName: "Facturation",
        role: "AGENT",
        emailVerified: true,
      },
    });
    await prisma.timeEntry.create({
      data: {
        userId: controlAgent.id,
        siteId: site.id,
        clockInAt: new Date(Date.UTC(YEAR, MONTH - 1, 1, 6, 0)),
        clockOutAt: new Date(Date.UTC(YEAR, MONTH - 1, 1, 9, 30)),
        status: "VALIDATED",
      },
    });

    const adminRow = await prisma.user.create({
      data: {
        email: `test-billing-admin-${suffix}@dlproprete.fr`,
        name: "Admin Facturation",
        firstName: "Admin",
        lastName: "Facturation",
        role: "ADMIN",
        emailVerified: true,
      },
    });

    clientId = client.id;
    siteId = site.id;
    calendarContractId = calendarContract.id;
    flatContractId = flatContract.id;
    adminUser = { id: adminRow.id, email: adminRow.email, role: "ADMIN", isActive: true };
  });

  afterAll(async () => {
    await prisma.payment.deleteMany({ where: { invoice: { clientId } } });
    await prisma.invoiceLine.deleteMany({ where: { invoice: { clientId } } });
    await prisma.invoice.deleteMany({ where: { clientId } });
    await prisma.timeEntry.deleteMany({ where: { siteId } });
    await prisma.shift.deleteMany({ where: { siteId } });
    await prisma.contract.deleteMany({ where: { siteId } });
    await prisma.site.delete({ where: { id: siteId } });
    await prisma.client.delete({ where: { id: clientId } });
    await prisma.user.deleteMany({
      where: { email: { in: [adminUser.email, `test-billing-agent-${suffix}@dlproprete.fr`] } },
    });
    // La numérotation utilise l'année d'émission réelle (aujourd'hui), pas
    // YEAR (fictive, pour isoler les fixtures) : rien à nettoyer sur
    // InvoiceSequence — on ne remet pas à zéro le compteur réel de l'année
    // en cours, ça consommerait juste un numéro (acceptable en dev).
  });

  it("génère un brouillon par contrat ACTIVE du mois, hors Shift CANCELLED", async () => {
    const result = await generateMonthlyInvoices(adminUser, YEAR, MONTH);
    expect(result.created).toHaveLength(2);

    const calInvoice = await prisma.invoice.findFirstOrThrow({
      where: { contractId: calendarContractId },
      include: { lines: true },
    });
    expect(calInvoice.status).toBe("DRAFT");
    expect(Number(calInvoice.lines[0].quantity)).toBe(6); // 3 x 2h, la vacation annulée de 5h exclue
    expect(Number(calInvoice.amountHT)).toBe(120); // 6h x 20€

    const flatInvoice = await prisma.invoice.findFirstOrThrow({
      where: { contractId: flatContractId },
      include: { lines: true },
    });
    expect(Number(flatInvoice.lines[0].quantity)).toBe(80); // forfait indicatif
    expect(Number(flatInvoice.amountHT)).toBe(1200); // 80h x 15€
  });

  it("relancer la génération met à jour les brouillons existants sans les dupliquer", async () => {
    const result = await generateMonthlyInvoices(adminUser, YEAR, MONTH);
    expect(result.created).toHaveLength(0);
    expect(result.updated).toHaveLength(2);

    const count = await prisma.invoice.count({ where: { contractId: calendarContractId } });
    expect(count).toBe(1);
  });

  it("une ligne ADHOC s'ajoute sur un brouillon et met à jour les totaux", async () => {
    const invoice = await prisma.invoice.findFirstOrThrow({ where: { contractId: calendarContractId } });
    await addAdhocLine(adminUser, invoice.id, {
      label: "Remise en état exceptionnelle",
      quantity: 1,
      unitPriceHT: 50,
      vatRate: 20,
    });
    const updated = await prisma.invoice.findUniqueOrThrow({ where: { id: invoice.id } });
    expect(Number(updated.amountHT)).toBe(170); // 120 + 50
  });

  it("émission : verrouille le numéro F-YYYY-NNNN et calcule l'échéance", async () => {
    const invoice = await prisma.invoice.findFirstOrThrow({ where: { contractId: calendarContractId } });
    const issued = await issueInvoice(adminUser, invoice.id);
    expect(issued.status).toBe("ISSUED");
    // Le numéro se base sur l'année d'émission réelle (aujourd'hui), pas
    // sur l'année fictive de la période facturée (YEAR, choisie pour
    // isoler les fixtures).
    const issuanceYear = new Date().getUTCFullYear();
    expect(issued.number).toMatch(new RegExp(`^F-${issuanceYear}-\\d{4}$`));
    expect(issued.issuedOn).not.toBeNull();
    expect(issued.dueOn).not.toBeNull();
  });

  it("une facture émise ne peut pas être ré-émise ni recevoir de ligne ADHOC", async () => {
    const invoice = await prisma.invoice.findFirstOrThrow({ where: { contractId: calendarContractId } });
    await expect(issueInvoice(adminUser, invoice.id)).rejects.toBeInstanceOf(InvoiceNotDraftError);
    await expect(
      addAdhocLine(adminUser, invoice.id, { label: "x", quantity: 1, unitPriceHT: 1 }),
    ).rejects.toBeInstanceOf(InvoiceNotDraftError);
  });

  it("un Shift déjà inclus dans une facture ISSUED n'est pas refacturé : le contrat est ignoré à la régénération", async () => {
    const result = await generateMonthlyInvoices(adminUser, YEAR, MONTH);
    const skippedContractIds = result.skipped.map((s) => s.contractId);
    expect(skippedContractIds).toContain(calendarContractId);
    expect(result.updated).toContain(
      (await prisma.invoice.findFirstOrThrow({ where: { contractId: flatContractId } })).id,
    );

    const count = await prisma.invoice.count({ where: { contractId: calendarContractId } });
    expect(count).toBe(1); // toujours une seule facture pour ce contrat+mois
  });

  it("paiement : partiel puis complet fait passer le statut PARTIALLY_PAID puis PAID", async () => {
    const invoice = await prisma.invoice.findFirstOrThrow({ where: { contractId: calendarContractId } });
    const totalTTC = Number(invoice.amountTTC);

    await recordPayment(adminUser, invoice.id, {
      paidOn: "2031-04-01",
      amount: totalTTC / 2,
      method: "TRANSFER",
    });
    let updated = await prisma.invoice.findUniqueOrThrow({ where: { id: invoice.id } });
    expect(updated.status).toBe("PARTIALLY_PAID");

    await recordPayment(adminUser, invoice.id, {
      paidOn: "2031-04-15",
      amount: totalTTC / 2,
      method: "TRANSFER",
    });
    updated = await prisma.invoice.findUniqueOrThrow({ where: { id: invoice.id } });
    expect(updated.status).toBe("PAID");
  });

  it("un paiement ne peut pas être saisi sur un brouillon", async () => {
    const draft = await prisma.invoice.findFirstOrThrow({ where: { contractId: flatContractId } });
    expect(draft.status).toBe("DRAFT");
    await expect(
      recordPayment(adminUser, draft.id, { paidOn: "2031-04-01", amount: 10, method: "CASH" }),
    ).rejects.toBeInstanceOf(InvoiceNotIssuedError);
  });

  it("les heures pointées validées sont un contrôle indépendant, jamais facturées", async () => {
    const control = await getValidatedHoursForContractMonth(adminUser, siteId, YEAR, MONTH);
    expect(control.entryCount).toBe(1);
    expect(control.totalHours).toBeCloseTo(3.5, 5); // 06:00-09:30

    const invoice = await prisma.invoice.findFirstOrThrow({
      where: { contractId: calendarContractId },
      include: { lines: true },
    });
    expect(Number(invoice.lines[0]?.quantity ?? 0)).not.toBe(control.totalHours);
  });
});
