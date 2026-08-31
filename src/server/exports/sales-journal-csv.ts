import { prisma } from "@/lib/prisma";
import { requireRole, type SessionUser } from "@/server/auth/session";
import { dateOnlyUTC, monthRange } from "@/lib/dates";
import { CSV_BOM, csvField } from "@/lib/csv";
import { INVOICE_STATUS_LABELS } from "@/lib/invoice-status";
import { computeBalanceDue } from "@/server/billing/balance";

const MANAGE_ROLES = ["ADMIN"] as const;

// Journal des ventes, pas un FEC complet : destiné à l'expert-comptable
// pour un contrôle rapide, pas à une téléprocédure. Même convention CSV
// que l'export pointages (BOM, ";", virgule décimale).
export async function exportSalesJournalCsv(
  user: SessionUser,
  year: number,
  month?: number,
): Promise<string> {
  requireRole(user, [...MANAGE_ROLES]);

  const { start, end } = month
    ? monthRange(year, month)
    : { start: dateOnlyUTC(year, 1, 1), end: dateOnlyUTC(year + 1, 1, 1) };

  // Un brouillon a issuedOn = null : exclu naturellement par ce filtre de
  // date, pas besoin de filtrer le statut explicitement.
  const invoices = await prisma.invoice.findMany({
    where: { issuedOn: { gte: start, lt: end } },
    include: {
      client: { select: { legalName: true } },
      contract: { include: { site: { select: { name: true } } } },
      payments: true,
    },
    orderBy: [{ issuedOn: "asc" }, { number: "asc" }],
  });

  const dateFormatter = new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris" });
  const decimal = (value: number) => value.toFixed(2).replace(".", ",");

  const header = [
    "Date émission",
    "Numéro",
    "Client",
    "Site",
    "Période",
    "HT",
    "TVA",
    "TTC",
    "Statut",
    "Payé",
    "Restant",
  ].join(";");

  const rows = invoices.map((invoice) => {
    const totalPaid = invoice.payments.reduce((sum, payment) => sum + Number(payment.amount), 0);
    const balanceDue = computeBalanceDue(invoice);
    const period =
      invoice.periodMonth && invoice.periodYear
        ? `${String(invoice.periodMonth).padStart(2, "0")}/${invoice.periodYear}`
        : "";

    return [
      csvField(invoice.issuedOn ? dateFormatter.format(invoice.issuedOn) : ""),
      csvField(invoice.number ?? ""),
      csvField(invoice.client.legalName),
      csvField(invoice.contract?.site.name ?? ""),
      csvField(period),
      decimal(Number(invoice.amountHT)),
      decimal(Number(invoice.vatAmount)),
      decimal(Number(invoice.amountTTC)),
      csvField(INVOICE_STATUS_LABELS[invoice.status] ?? invoice.status),
      decimal(totalPaid),
      decimal(balanceDue),
    ].join(";");
  });

  return [CSV_BOM + header, ...rows].join("\r\n");
}
