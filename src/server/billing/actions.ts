import { prisma } from "@/lib/prisma";
import { requireRole, type SessionUser } from "@/server/auth/session";
import { adhocLineInputSchema, paymentInputSchema } from "@/lib/zod/invoice";
import { nextInvoiceNumber } from "./numbering";

const MANAGE_ROLES = ["ADMIN"] as const;

export class InvoiceNotDraftError extends Error {}
export class InvoiceNotIssuedError extends Error {}
export class EmptyInvoiceError extends Error {}

export async function recomputeInvoiceTotals(invoiceId: string) {
  const lines = await prisma.invoiceLine.findMany({ where: { invoiceId } });
  let amountHT = 0;
  let vatAmount = 0;
  for (const line of lines) {
    const lineHT = Number(line.quantity) * Number(line.unitPriceHT);
    amountHT += lineHT;
    vatAmount += lineHT * (Number(line.vatRate) / 100);
  }
  await prisma.invoice.update({
    where: { id: invoiceId },
    data: { amountHT, vatAmount, amountTTC: amountHT + vatAmount },
  });
}

// Ligne ADHOC : uniquement sur un brouillon (une facture émise est
// verrouillée, cf. règle dure "correction par avoir").
export async function addAdhocLine(user: SessionUser, invoiceId: string, input: unknown) {
  requireRole(user, [...MANAGE_ROLES]);
  const data = adhocLineInputSchema.parse(input);
  const invoice = await prisma.invoice.findUniqueOrThrow({ where: { id: invoiceId } });
  if (invoice.status !== "DRAFT") {
    throw new InvoiceNotDraftError("Une ligne ne peut être ajoutée que sur un brouillon.");
  }

  await prisma.invoiceLine.create({
    data: {
      invoiceId,
      label: data.label,
      quantity: data.quantity,
      unitPriceHT: data.unitPriceHT,
      vatRate: data.vatRate,
      source: "ADHOC",
    },
  });
  await recomputeInvoiceTotals(invoiceId);
}

// Émission : verrouille le numéro (définitif, jamais réattribué) et calcule
// l'échéance à partir du délai de paiement client. ADMIN seulement.
export async function issueInvoice(user: SessionUser, invoiceId: string) {
  requireRole(user, [...MANAGE_ROLES]);
  const invoice = await prisma.invoice.findUniqueOrThrow({
    where: { id: invoiceId },
    include: { lines: true, client: true },
  });
  if (invoice.status !== "DRAFT") {
    throw new InvoiceNotDraftError("Seul un brouillon peut être émis.");
  }
  if (invoice.lines.length === 0) {
    throw new EmptyInvoiceError("Une facture sans ligne ne peut pas être émise.");
  }

  const issuedOn = new Date();
  const dueOn = new Date(issuedOn.getTime() + invoice.client.paymentTermDays * 86_400_000);

  return prisma.$transaction(async (tx) => {
    const number = await nextInvoiceNumber(tx, issuedOn.getUTCFullYear());
    return tx.invoice.update({
      where: { id: invoiceId },
      data: { number, status: "ISSUED", issuedOn, dueOn },
    });
  });
}

async function recomputeInvoicePaymentStatus(invoiceId: string) {
  const invoice = await prisma.invoice.findUniqueOrThrow({
    where: { id: invoiceId },
    include: { payments: true },
  });
  const totalPaid = invoice.payments.reduce((sum, payment) => sum + Number(payment.amount), 0);
  const status = totalPaid <= 0 ? "ISSUED" : totalPaid >= Number(invoice.amountTTC) ? "PAID" : "PARTIALLY_PAID";
  await prisma.invoice.update({ where: { id: invoiceId }, data: { status } });
}

export async function recordPayment(user: SessionUser, invoiceId: string, input: unknown) {
  requireRole(user, [...MANAGE_ROLES]);
  const data = paymentInputSchema.parse(input);
  const invoice = await prisma.invoice.findUniqueOrThrow({ where: { id: invoiceId } });
  if (invoice.status === "DRAFT" || invoice.status === "CANCELLED") {
    throw new InvoiceNotIssuedError("Un paiement ne peut être saisi que sur une facture émise.");
  }

  await prisma.payment.create({
    data: {
      invoiceId,
      paidOn: data.paidOn,
      amount: data.amount,
      method: data.method,
      reference: data.reference,
    },
  });
  await recomputeInvoicePaymentStatus(invoiceId);
}
