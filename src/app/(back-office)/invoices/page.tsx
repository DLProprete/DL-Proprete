import Link from "next/link";
import { redirect } from "next/navigation";
import { requireSession } from "@/server/auth/session";
import { listInvoices } from "@/server/billing/queries";
import { parisToday } from "@/lib/dates";
import { generateInvoicesAction } from "./actions";

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Brouillon",
  ISSUED: "Émise",
  PARTIALLY_PAID: "Partiellement payée",
  PAID: "Payée",
  CANCELLED: "Annulée",
};

function formatAmount(amount: unknown) {
  return `${Number(amount).toFixed(2)} €`;
}

export default async function InvoicesPage() {
  const user = await requireSession();
  if (user.role !== "ADMIN") {
    redirect("/clients");
  }

  const invoices = await listInvoices(user);
  const today = parisToday();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Factures</h1>
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
            className="rounded bg-zinc-900 px-3 py-2 text-sm text-white hover:bg-zinc-800"
          >
            Générer les factures du mois
          </button>
        </form>
      </div>

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
              <td>{STATUS_LABELS[invoice.status] ?? invoice.status}</td>
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
