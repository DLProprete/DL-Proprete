import { requireClientSession } from "@/server/client-portal/session";
import { listMyInvoices } from "@/server/client-portal/queries";
import { computeBalanceDue } from "@/server/billing/balance";
import { dateOnlyUTC, parisToday } from "@/lib/dates";
import { invoiceStatusBadge } from "@/lib/invoice-status";
import { Badge } from "@/components/badge";

function formatAmount(amount: unknown) {
  return `${Number(amount).toFixed(2)} €`;
}

export default async function PortalPage() {
  const session = await requireClientSession();
  const invoices = await listMyInvoices(session.clientId);
  const today = parisToday();
  const todayDate = dateOnlyUTC(today.year, today.month, today.day);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Mes factures</h1>
      <div className="card-table">
        <table>
          <thead>
            <tr>
              <th>Numéro</th>
              <th>Période</th>
              <th>Total TTC</th>
              <th>Statut</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((invoice) => (
              <tr key={invoice.id}>
                <td className="text-zinc-900">{invoice.number ?? "—"}</td>
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
                <td>
                  <a
                    href={`/api/client-portal/invoices/${invoice.id}/pdf`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm underline"
                  >
                    PDF
                  </a>
                </td>
              </tr>
            ))}
            {invoices.length === 0 && (
              <tr>
                <td colSpan={5} className="text-zinc-500">
                  Aucune facture pour l&apos;instant.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
