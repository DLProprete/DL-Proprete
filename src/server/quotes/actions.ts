import { prisma } from "@/lib/prisma";
import { requireRole, type SessionUser } from "@/server/auth/session";
import { sendEmail } from "@/lib/email";
import { logAudit } from "@/server/audit/log";
import { createContract } from "@/server/contracts/actions";
import { convertProspectToClient } from "@/server/prospects/actions";

const MANAGE_ROLES = ["ADMIN", "PLANNER"] as const;

function totals(lines: { quantity: number; unitPriceHT: number; vatRate: number }[]) {
  let amountHT = 0;
  let vatAmount = 0;
  for (const line of lines) {
    const ht = line.quantity * line.unitPriceHT;
    amountHT += ht;
    vatAmount += ht * (line.vatRate / 100);
  }
  return { amountHT, vatAmount, amountTTC: amountHT + vatAmount };
}

export async function createQuote(
  user: SessionUser,
  prospectId: string,
  input: { notes?: string; validUntil?: string; lines: { label: string; quantity: number; unitPriceHT: number; vatRate: number }[] },
) {
  requireRole(user, [...MANAGE_ROLES]);
  const prospect = await prisma.prospect.findUniqueOrThrow({ where: { id: prospectId } });
  const year = new Date().getFullYear();
  const count = await prisma.quote.count({ where: { reference: { startsWith: `D-${year}-` } } });
  const reference = `D-${year}-${String(count + 1).padStart(4, "0")}`;
  const sums = totals(input.lines);
  const quote = await prisma.quote.create({
    data: {
      prospectId,
      reference,
      notes: input.notes || null,
      validUntil: input.validUntil ? new Date(input.validUntil) : null,
      ...sums,
      lines: { create: input.lines },
    },
  });
  await logAudit(prisma, {
    actorUserId: user.id,
    action: "QUOTE_CREATED",
    entityType: "Quote",
    entityId: quote.id,
    summary: `Devis ${reference} — ${prospect.legalName}`,
  });
  return quote;
}

export async function sendQuoteEmail(user: SessionUser, quoteId: string) {
  requireRole(user, [...MANAGE_ROLES]);
  const quote = await prisma.quote.findUniqueOrThrow({
    where: { id: quoteId },
    include: { prospect: true, lines: true },
  });
  if (!quote.prospect.email) throw new Error("Ce prospect n'a pas d'e-mail.");
  const lines = quote.lines
    .map((line) => `- ${line.label} : ${Number(line.quantity)} × ${Number(line.unitPriceHT).toFixed(2)} € HT`)
    .join("\n");
  await sendEmail({
    to: quote.prospect.email,
    subject: `Devis ${quote.reference} — DL Propreté`,
    text: `Bonjour,\n\nVeuillez trouver notre devis ${quote.reference}.\nMontant : ${Number(quote.amountTTC).toFixed(2)} € TTC.\n\n${lines}\n\nCordialement,\nDL Propreté`,
  });
  await prisma.quote.update({ where: { id: quoteId }, data: { status: "SENT", sentAt: new Date() } });
  await prisma.prospect.update({ where: { id: quote.prospectId }, data: { status: "QUOTE_SENT" } });
}

export async function acceptQuoteAndConvert(user: SessionUser, quoteId: string) {
  requireRole(user, [...MANAGE_ROLES]);
  const quote = await prisma.quote.findUniqueOrThrow({
    where: { id: quoteId },
    include: { prospect: true },
  });
  let clientId = quote.prospect.convertedClientId;
  if (!clientId) {
    const client = await convertProspectToClient(user, quote.prospectId, {
      legalName: quote.prospect.legalName,
      billingAddress: quote.prospect.address || "Adresse à compléter",
      email: quote.prospect.email || "",
      phone: quote.prospect.phone || "",
    });
    clientId = client.id;
  }
  const start = new Date();
  const end = new Date(start);
  end.setFullYear(end.getFullYear() + 1);
  const contract = await createContract(user, {
    clientId,
    reference: `C-${quote.reference}`,
    startsOn: start.toISOString().slice(0, 10),
    endsOn: end.toISOString().slice(0, 10),
    status: "DRAFT",
    notes: `Issu du devis ${quote.reference}`,
  });
  await prisma.quote.update({
    where: { id: quoteId },
    data: { status: "ACCEPTED", acceptedAt: new Date(), contractId: contract.id },
  });
  return { clientId, contractId: contract.id };
}
