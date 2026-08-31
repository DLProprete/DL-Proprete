import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { CompanyProfile } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { SessionUser } from "@/server/auth/session";
import { coverageWarningsForContract, generateMonthlyInvoices } from "./generate-invoices";
import {
  addAdhocLine,
  issueInvoice,
  markInvoiceReminded,
  recordPayment,
  InvoiceLegalMentionsIncompleteError,
  InvoiceNotDraftError,
  InvoiceNotIssuedError,
} from "./actions";
import { listInvoicesForReminders } from "./reminders";
import { getValidatedHoursForContractMonth } from "./queries";

// Mentions legales de test, completes : issueInvoice() bloque desormais si
// la fiche entreprise est incomplete (voir le test dedie plus bas), donc
// toute la suite a besoin d'un profil complet pour ses autres tests
// d'emission. Valeurs fictives, sans rapport avec la vraie fiche DL Propreté.
const TEST_LEGAL_MENTIONS = {
  legalForm: "SAS",
  shareCapital: 1000,
  rcsCity: "Caen",
  siret: "111 222 333 00099",
  vatNumber: "FR00 111222333",
  iban: "FR7630006000011234567890189",
};

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
  let originalCompanyProfile: CompanyProfile | null;

  beforeAll(async () => {
    // issueInvoice() exige une fiche entreprise complete : on sauvegarde
    // l'existant (potentiellement incomplet en dev, cf. audit du 31/08) pour
    // le restaurer en afterAll plutot que de laisser trainer des valeurs de
    // test sur la ligne partagee "default".
    originalCompanyProfile = await prisma.companyProfile.findUnique({ where: { id: "default" } });
    await prisma.companyProfile.upsert({
      where: { id: "default" },
      update: TEST_LEGAL_MENTIONS,
      create: {
        id: "default",
        legalName: "DL PROPRETE",
        address: "3 rue de Verdun, 14460 Colombelles",
        ...TEST_LEGAL_MENTIONS,
      },
    });

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
          billableMinutes: 120,
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
        billableMinutes: 120,
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
    if (originalCompanyProfile) {
      await prisma.companyProfile.update({
        where: { id: "default" },
        data: {
          legalName: originalCompanyProfile.legalName,
          address: originalCompanyProfile.address,
          legalForm: originalCompanyProfile.legalForm,
          shareCapital: originalCompanyProfile.shareCapital,
          rcsCity: originalCompanyProfile.rcsCity,
          siret: originalCompanyProfile.siret,
          vatNumber: originalCompanyProfile.vatNumber,
          iban: originalCompanyProfile.iban,
          latePenaltyRate: originalCompanyProfile.latePenaltyRate,
        },
      });
    } else {
      await prisma.companyProfile.delete({ where: { id: "default" } });
    }

    // Le journal d'audit n'est pas nettoye par cascade. Sans ces deux lignes,
    // chaque execution de la suite laissait en base des paiements de test
    // orphelins (leur acteur supprime, ils s'affichaient "Système") qui
    // polluaient l'ecran Audit en developpement.
    const invoiceIds = (
      await prisma.invoice.findMany({ where: { clientId }, select: { id: true } })
    ).map((invoice) => invoice.id);
    await prisma.auditLog.deleteMany({ where: { entityId: { in: invoiceIds } } });
    await prisma.auditLog.deleteMany({ where: { actorUserId: adminUser.id } });
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

    const createdLogs = await prisma.auditLog.count({
      where: { action: "INVOICE_CREATED", entityId: { in: [calInvoice.id, flatInvoice.id] } },
    });
    expect(createdLogs).toBe(2);
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

  it("émission refusée si la fiche entreprise est incomplète (capital social, IBAN manquants)", async () => {
    const invoice = await prisma.invoice.findFirstOrThrow({ where: { contractId: calendarContractId } });
    await prisma.companyProfile.update({
      where: { id: "default" },
      data: { shareCapital: null, iban: null },
    });
    try {
      await expect(issueInvoice(adminUser, invoice.id)).rejects.toBeInstanceOf(
        InvoiceLegalMentionsIncompleteError,
      );
      const stillDraft = await prisma.invoice.findUniqueOrThrow({ where: { id: invoice.id } });
      expect(stillDraft.status).toBe("DRAFT");
    } finally {
      await prisma.companyProfile.update({ where: { id: "default" }, data: TEST_LEGAL_MENTIONS });
    }
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
    // Un paiement enregistré = une seule ligne d'audit (pas de double appel).
    expect(
      await prisma.auditLog.count({ where: { action: "INVOICE_PAYMENT", entityId: invoice.id } }),
    ).toBe(1);

    await recordPayment(adminUser, invoice.id, {
      paidOn: "2031-04-15",
      amount: totalTTC / 2,
      method: "TRANSFER",
    });
    updated = await prisma.invoice.findUniqueOrThrow({ where: { id: invoice.id } });
    expect(updated.status).toBe("PAID");
    expect(
      await prisma.auditLog.count({ where: { action: "INVOICE_PAYMENT", entityId: invoice.id } }),
    ).toBe(2);
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

// Test d'intégration séparé (fixtures propres) : les relances lisent
// directement des factures ISSUED/PARTIALLY_PAID, pas besoin de rejouer la
// chaîne génération -> émission du describe ci-dessus.
describe("relances facture (intégration DB)", () => {
  const suffix = Date.now();
  let clientId: string;
  let adminUser: SessionUser;
  let dueSoonInvoiceId: string;
  let dueFarInvoiceId: string;
  let fallbackInvoiceId: string;
  let draftInvoiceId: string;

  beforeAll(async () => {
    const client = await prisma.client.create({
      data: {
        legalName: "Client Test Relances",
        billingAddress: "1 rue Test",
        paymentTermDays: 30,
      },
    });
    const adminRow = await prisma.user.create({
      data: {
        email: `test-reminders-admin-${suffix}@dlproprete.fr`,
        name: "Admin Relances",
        firstName: "Admin",
        lastName: "Relances",
        role: "ADMIN",
        emailVerified: true,
      },
    });
    clientId = client.id;
    adminUser = { id: adminRow.id, email: adminRow.email, role: "ADMIN", isActive: true };

    const now = Date.now();
    const in3Days = new Date(now + 3 * 86_400_000);
    const in60Days = new Date(now + 60 * 86_400_000);
    // issuedOn = J-35 : sans dueOn, le repli (issuedOn + 30j) tombe à J-5,
    // donc dans la fenêtre de relance (due ou à J+7).
    const issued35DaysAgo = new Date(now - 35 * 86_400_000);

    const dueSoon = await prisma.invoice.create({
      data: {
        clientId,
        status: "ISSUED",
        number: `F-TEST-REM-${suffix}-SOON`,
        issuedOn: new Date(now),
        dueOn: in3Days,
        amountHT: 100,
        vatAmount: 20,
        amountTTC: 120,
      },
    });
    const dueFar = await prisma.invoice.create({
      data: {
        clientId,
        status: "ISSUED",
        number: `F-TEST-REM-${suffix}-FAR`,
        issuedOn: new Date(now),
        dueOn: in60Days,
        amountHT: 100,
        vatAmount: 20,
        amountTTC: 120,
      },
    });
    const fallback = await prisma.invoice.create({
      data: {
        clientId,
        status: "PARTIALLY_PAID",
        number: `F-TEST-REM-${suffix}-FALLBACK`,
        issuedOn: issued35DaysAgo,
        dueOn: null,
        amountHT: 100,
        vatAmount: 20,
        amountTTC: 120,
      },
    });
    const draft = await prisma.invoice.create({
      data: { clientId, status: "DRAFT", amountHT: 0, vatAmount: 0, amountTTC: 0 },
    });

    dueSoonInvoiceId = dueSoon.id;
    dueFarInvoiceId = dueFar.id;
    fallbackInvoiceId = fallback.id;
    draftInvoiceId = draft.id;
  });

  afterAll(async () => {
    await prisma.auditLog.deleteMany({ where: { entityType: "Invoice", entityId: { in: [dueSoonInvoiceId, dueFarInvoiceId, fallbackInvoiceId, draftInvoiceId] } } });
    await prisma.invoice.deleteMany({ where: { clientId } });
    await prisma.client.delete({ where: { id: clientId } });
    await prisma.user.delete({ where: { id: adminUser.id } });
  });

  it("rejette une relance sur une facture non émise", async () => {
    await expect(
      markInvoiceReminded(adminUser, draftInvoiceId, { remindedOn: "2026-01-01" }),
    ).rejects.toBeInstanceOf(InvoiceNotIssuedError);
  });

  it("note une relance sur une facture émise et journalise INVOICE_REMINDED", async () => {
    await markInvoiceReminded(adminUser, dueSoonInvoiceId, {
      remindedOn: "2026-01-05",
      note: "Appel client",
    });
    const log = await prisma.auditLog.findFirstOrThrow({
      where: { action: "INVOICE_REMINDED", entityId: dueSoonInvoiceId },
    });
    expect(log.summary).toContain("Relance");
    expect((log.metadata as { note: string | null } | null)?.note).toBe("Appel client");
  });

  it("liste les factures dues ou à J+7 avec solde et dernière relance", async () => {
    const list = await listInvoicesForReminders(adminUser);
    const ids = list.map((invoice) => invoice.id);
    expect(ids).toContain(dueSoonInvoiceId);
    expect(ids).not.toContain(dueFarInvoiceId);
    expect(ids).not.toContain(draftInvoiceId);

    const dueSoonRow = list.find((invoice) => invoice.id === dueSoonInvoiceId);
    expect(dueSoonRow?.balanceDue).toBe(120);
    expect(dueSoonRow?.lastRemindedAt).not.toBeNull();
  });

  it("applique le repli échéance = émission + 30 jours quand dueOn est absent", async () => {
    const list = await listInvoicesForReminders(adminUser);
    expect(list.map((invoice) => invoice.id)).toContain(fallbackInvoiceId);
  });
});

// Regression Lot 1 : une vacation a plusieurs agents vend autant d'heures de
// main-d'oeuvre qu'elle mobilise d'agents, et une facture assise sur un mois
// partiellement planifie doit se signaler avant emission.
describe("heures d'agent et complétude du mois (intégration DB)", () => {
  const suffix = Date.now();
  const YEAR = 2032;
  const MONTH = 3;
  let clientId: string;
  let siteId: string;
  let contractId: string;
  let adminUser: SessionUser;

  beforeAll(async () => {
    const client = await prisma.client.create({
      data: {
        legalName: "Client Test Multi-agents",
        billingAddress: "2 rue Test",
        paymentTermDays: 30,
      },
    });
    const site = await prisma.site.create({
      data: {
        clientId: client.id,
        name: "Site Test Multi-agents",
        address: "2 rue Test",
        city: "Caen",
        postalCode: "14000",
      },
    });
    const contract = await prisma.contract.create({
      data: {
        clientId: client.id,
        siteId: site.id,
        reference: `C-TEST-MULTI-${suffix}`,
        startsOn: new Date(Date.UTC(YEAR, 0, 1)),
        endsOn: new Date(Date.UTC(YEAR, 11, 31)),
        hourlyRateHT: 30,
        vatRate: 20,
        status: "ACTIVE",
        billingBasis: "CALENDAR_SHIFTS",
        // Reference contractuelle volontairement eloignee du planning cree
        // ci-dessous, pour declencher l'alerte d'ecart.
        indicativeMonthlyHours: 40,
      },
    });

    // Le cas exact remonte par l'audit : fenetre d'acces 08:30-10:00 (90 min),
    // 90 min vendues, 2 agents requis. Six passages = 18 h de main-d'oeuvre.
    for (const day of [2, 5, 9, 12, 16, 19]) {
      await prisma.shift.create({
        data: {
          siteId: site.id,
          contractId: contract.id,
          date: new Date(Date.UTC(YEAR, MONTH - 1, day)),
          startAt: new Date(Date.UTC(YEAR, MONTH - 1, day, 8, 30)),
          endAt: new Date(Date.UTC(YEAR, MONTH - 1, day, 10, 0)),
          requiredAgents: 2,
          billableMinutes: 90,
          status: "PLANNED",
          generatedFromTemplate: false,
        },
      });
    }

    const adminRow = await prisma.user.create({
      data: {
        email: `test-multi-admin-${suffix}@dlproprete.fr`,
        name: "Admin Multi",
        firstName: "Admin",
        lastName: "Multi",
        role: "ADMIN",
        emailVerified: true,
      },
    });

    clientId = client.id;
    siteId = site.id;
    contractId = contract.id;
    adminUser = { id: adminRow.id, email: adminRow.email, role: "ADMIN", isActive: true };
  });

  afterAll(async () => {
    const invoiceIds = (
      await prisma.invoice.findMany({ where: { clientId }, select: { id: true } })
    ).map((invoice) => invoice.id);
    // L'audit n'est pas nettoye par cascade : sans ca les fixtures laissent
    // des lignes orphelines dans le journal (constate en dev le 31/08/2026,
    // elles s'affichaient comme des paiements reels signes "Système").
    await prisma.auditLog.deleteMany({ where: { entityId: { in: invoiceIds } } });
    await prisma.auditLog.deleteMany({ where: { actorUserId: adminUser.id } });
    await prisma.payment.deleteMany({ where: { invoice: { clientId } } });
    await prisma.invoiceLine.deleteMany({ where: { invoice: { clientId } } });
    await prisma.invoice.deleteMany({ where: { clientId } });
    await prisma.shift.deleteMany({ where: { siteId } });
    await prisma.contract.deleteMany({ where: { siteId } });
    await prisma.site.delete({ where: { id: siteId } });
    await prisma.client.delete({ where: { id: clientId } });
    await prisma.user.delete({ where: { id: adminUser.id } });
  });

  it("facture les heures d'agent, pas les créneaux", async () => {
    await generateMonthlyInvoices(adminUser, YEAR, MONTH);
    const invoice = await prisma.invoice.findFirstOrThrow({
      where: { contractId },
      include: { lines: true },
    });
    // 6 passages x 90 min x 2 agents = 18 h. Avant correction : 9 h, soit la
    // moitie du montant du.
    expect(Number(invoice.lines[0].quantity)).toBe(18);
    expect(Number(invoice.amountHT)).toBe(540);
  });

  it("signale un mois partiellement planifié et un écart au volume contractuel", async () => {
    const result = await generateMonthlyInvoices(adminUser, YEAR, MONTH);
    const entry = result.warnings.find((warning) => warning.contractId === contractId);
    expect(entry).toBeDefined();
    const kinds = entry!.warnings.map((warning) => warning.kind);
    // Derniere vacation le 19, mois de 31 jours.
    expect(kinds).toContain("PARTIAL_MONTH");
    // 18 h calculees contre 40 h de reference contractuelle.
    expect(kinds).toContain("FAR_FROM_INDICATIVE");
  });

  it("coverageWarningsForContract est utilisable seule, hors génération groupée (fiche facture)", async () => {
    // C'est cette fonction que la fiche facture appelle pour reafficher
    // l'alerte si l'ADMIN emet le brouillon longtemps apres sa generation :
    // elle doit donner le meme resultat que le calcul interne a la
    // generation groupee, sans dependre d'un GenerateInvoicesResult.
    const warnings = await coverageWarningsForContract({ id: contractId, indicativeMonthlyHours: 40 }, YEAR, MONTH);
    const kinds = warnings.map((warning) => warning.kind);
    expect(kinds).toContain("PARTIAL_MONTH");
    expect(kinds).toContain("FAR_FROM_INDICATIVE");
  });
});
