import Link from "next/link";
import { redirect } from "next/navigation";
import { requireSession } from "@/server/auth/session";
import { listInvoices } from "@/server/billing/queries";
import { computeBalanceDue } from "@/server/billing/balance";
import { dateOnlyUTC, parisToday } from "@/lib/dates";
import { invoiceStatusBadge } from "@/lib/invoice-status";
import { Badge } from "@/components/badge";
import { generateInvoicesAction } from "./actions";

function formatAmount(amount: unknown) {
  return `${Number(amount).toFixed(2)} €`;
}

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ alerte?: string }>;
}) {
  const { alerte } = await searchParams;
  const alerts = alerte ? alerte.split("|").filter(Boolean) : [];
  const user = await requireSession();
  if (user.role !== "ADMIN") {
    redirect("/clients");
  }

  const invoices = await listInvoices(user);
  const today = parisToday();
  const todayDate = dateOnlyUTC(today.year, today.month, today.day);

  return (
    <div className="space-y-6">
      {alerts.length > 0 && (
        <div className="rounded border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          <p className="font-medium">À vérifier avant d&apos;émettre</p>
          <ul className="mt-1 list-disc space-y-1 pl-5">
            {alerts.map((message) => (
              <li key={message}>{message}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-semibold">Factures</h1>
          <Link href="/invoices/reminders" className="text-sm underline">
            Relances
          </Link>
        </div>
        <form action={generateInvoicesAction} className="flex items-center gap-2">
          <input type="number" name="year" defaultValue={today.year} className="w-24 rounded border border-zinc-300 px-2 py-1 text-sm" />
          <input
            type="number"
            name="month"
            min={1}
            max={12}
            defaultValue={today.month}
            className="w-16 rounded border border-zinc-300 px-2 py-1 text-sm"
          />
          <button
            type="submit"
            className="rounded bg-teal-700 px-3 py-2 text-sm text-white hover:bg-teal-800"
          >
            Générer les factures du mois
          </button>
        </form>
      </div>

      <form action="/api/exports/sales-journal" method="get" className="flex items-center gap-2 text-sm">
        <span className="text-zinc-500">Export journal des ventes</span>
        <input
          type="number"
          name="year"
          defaultValue={today.year}
          className="w-24 rounded border border-zinc-300 px-2 py-1"
        />
        <input
          type="number"
          name="month"
          min={1}
          max={12}
          placeholder="Mois (facultatif)"
          className="w-36 rounded border border-zinc-300 px-2 py-1"
        />
        <button type="submit" className="rounded border border-zinc-300 px-3 py-2 hover:bg-zinc-50">
          Exporter
        </button>
      </form>

      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-zinc-200 text-zinc-500">
            <th className="py-2 font-medium">Numéro</th>
            <th className="font-medium">Client</th>
            <th className="font-medium">Contrat</th>
            <th className="font-medium">Période</th>
            <th className="font-medium">Total TTC</th>
            <th className="font-medium">Statut</th>
          </tr>
        </thead>
        <tbody>
          {invoices.map((invoice) => (
            <tr key={invoice.id} className="border-b border-zinc-100">
              <td className="py-2">
                <Link href={`/invoices/${invoice.id}`} className="text-zinc-900 underline">
                  {invoice.number ?? "Brouillon"}
                </Link>
              </td>
              <td className="text-zinc-600">{invoice.client.legalName}</td>
              <td className="text-zinc-600">{invoice.contract?.reference ?? "—"}</td>
              <td className="text-zinc-600">
                {invoice.periodMonth && invoice.periodYear
                  ? `${String(invoice.periodMonth).padStart(2, "0")}/${invoice.periodYear}`
                  : "—"}
              </td>
              <td className="text-zinc-600">{formatAmount(invoice.amountTTC)}</td>
              <td>
                <Badge
                  {...invoiceStatusBadge(
                    { status: invoice.status, dueOn: invoice.dueOn, balanceDue: computeBalanceDue(invoice) },
                    todayDate,
                  )}
                />
              </td>
            </tr>
          ))}
          {invoices.length === 0 && (
            <tr>
              <td colSpan={6} className="py-4 text-zinc-400">
                Aucune facture pour l&apos;instant.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
