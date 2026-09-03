import { prisma } from "@/lib/prisma";
import { requireRole, type SessionUser } from "@/server/auth/session";
import { sendEmail } from "@/lib/email";
import { getCompanyProfile } from "@/server/settings/queries";
import { generateInvoicePdf } from "./pdf";
import { logAudit } from "@/server/audit/log";
import { computeBalanceDue } from "./balance";

const MANAGE_ROLES = ["ADMIN"] as const;

export class InvoiceClientEmailMissingError extends Error {}
export class InvoiceNotSendableError extends Error {}

export async function sendInvoiceByEmail(user: SessionUser, invoiceId: string) {
  requireRole(user, [...MANAGE_ROLES]);
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: { client: true, lines: true },
  });
  if (!invoice) throw new Error("Facture introuvable");
  if (invoice.status === "DRAFT" || invoice.status === "CANCELLED") {
    throw new InvoiceNotSendableError("Seule une facture émise peut être envoyée.");
  }
  if (!invoice.client.email) throw new InvoiceClientEmailMissingError("Ce client n'a pas d'e-mail.");

  const company = await getCompanyProfile();
  const pdf = await generateInvoicePdf(invoice, company);
  const number = invoice.number ?? invoice.id;
  await sendEmail({
    to: invoice.client.email,
    subject: `Facture ${number} — DL Propreté`,
    text: `Bonjour,\n\nVeuillez trouver ci-joint la facture ${number} d'un montant de ${Number(invoice.amountTTC).toFixed(2)} € TTC.\n\nCordialement,\nDL Propreté`,
    attachments: [{ filename: `facture-${number}.pdf`, content: pdf, contentType: "application/pdf" }],
  });
  await logAudit(prisma, {
    actorUserId: user.id,
    action: "INVOICE_EMAILED",
    entityType: "Invoice",
    entityId: invoice.id,
    summary: `Facture envoyée par e-mail : ${number} → ${invoice.client.email}`,
  });
}

export async function sendInvoiceReminderEmail(user: SessionUser, invoiceId: string) {
  requireRole(user, [...MANAGE_ROLES]);
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: { client: true, lines: true, payments: true },
  });
  if (!invoice) throw new Error("Facture introuvable");
  if (invoice.status !== "ISSUED" && invoice.status !== "PARTIALLY_PAID") {
    throw new InvoiceNotSendableError("Une relance ne concerne qu'une facture impayée.");
  }
  if (!invoice.client.email) throw new InvoiceClientEmailMissingError("Ce client n'a pas d'e-mail.");

  const due = invoice.dueOn ? invoice.dueOn.getTime() : Date.now();
  const daysLate = Math.floor((Date.now() - due) / 86_400_000);
  const kind = daysLate >= 15 ? "J+15" : "J+5";
  const balance = computeBalanceDue(invoice);
  const company = await getCompanyProfile();
  const pdf = await generateInvoicePdf(invoice, company);
  const number = invoice.number ?? invoice.id;
  await sendEmail({
    to: invoice.client.email,
    subject: `Relance ${kind} — facture ${number}`,
    text: `Bonjour,\n\nSauf erreur, la facture ${number} reste due (${balance.toFixed(2)} €). Relance ${kind}.\n\nCordialement,\nDL Propreté`,
    attachments: [{ filename: `facture-${number}.pdf`, content: pdf, contentType: "application/pdf" }],
  });
  await logAudit(prisma, {
    actorUserId: user.id,
    action: "INVOICE_REMINDED",
    entityType: "Invoice",
    entityId: invoice.id,
    summary: `Relance ${kind} envoyée : ${number} → ${invoice.client.email}`,
    metadata: { kind, daysLate },
  });
}
