import { prisma } from "@/lib/prisma";
import { requireRole, type SessionUser } from "@/server/auth/session";
import { addDays, dateOnlyUTC, parisToday } from "@/lib/dates";
import { computeBalanceDue } from "./balance";

const MANAGE_ROLES = ["ADMIN"] as const;
const REMINDER_WINDOW_DAYS = 7;

// dueOn est toujours renseigné par issueInvoice (émission + délai client),
// ce fallback ne couvre qu'une ligne créée hors de ce flux normal — pas de
// backfill en base, juste pour ne pas l'exclure silencieusement de la liste.
// Reprend le délai réel du client (paymentTermDays), pas une valeur fixe :
// une échéance à 30j pour un client à 60j serait fausse d'un mois entier.
function effectiveDueOn(invoice: {
  issuedOn: Date | null;
  dueOn: Date | null;
  client: { paymentTermDays: number };
}): Date | null {
  if (invoice.dueOn) return invoice.dueOn;
  if (invoice.issuedOn) return addDays(invoice.issuedOn, invoice.client.paymentTermDays);
  return null;
}

export async function listInvoicesForReminders(user: SessionUser) {
  requireRole(user, [...MANAGE_ROLES]);
  const today = parisToday();
  const horizon = addDays(dateOnlyUTC(today.year, today.month, today.day), REMINDER_WINDOW_DAYS);

  const invoices = await prisma.invoice.findMany({
    where: { status: { in: ["ISSUED", "PARTIALLY_PAID"] } },
    include: {
      client: { select: { legalName: true, paymentTermDays: true } },
      contract: { include: { site: { select: { name: true } } } },
      payments: true,
    },
  });

  const dueSoon = invoices
    .map((invoice) => ({ invoice, dueOn: effectiveDueOn(invoice) }))
    .filter((row): row is { invoice: (typeof invoices)[number]; dueOn: Date } => row.dueOn !== null && row.dueOn <= horizon)
    .sort((a, b) => a.dueOn.getTime() - b.dueOn.getTime());

  const invoiceIds = dueSoon.map((row) => row.invoice.id);
  const lastReminders = await prisma.auditLog.findMany({
    where: { action: "INVOICE_REMINDED", entityType: "Invoice", entityId: { in: invoiceIds } },
    orderBy: { createdAt: "desc" },
  });
  const lastReminderByInvoiceId = new Map<string, Date>();
  for (const reminder of lastReminders) {
    if (!lastReminderByInvoiceId.has(reminder.entityId)) {
      lastReminderByInvoiceId.set(reminder.entityId, reminder.createdAt);
    }
  }

  return dueSoon.map(({ invoice, dueOn }) => ({
    ...invoice,
    dueOn,
    balanceDue: computeBalanceDue(invoice),
    lastRemindedAt: lastReminderByInvoiceId.get(invoice.id) ?? null,
  }));
}
