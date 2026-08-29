import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireSession } from "@/server/auth/session";
import { getInvoice, getValidatedHoursForContractMonth } from "@/server/billing/queries";
import { addAdhocLineAction, issueInvoiceAction, recordPaymentAction } from "../actions";

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Brouillon",
  ISSUED: "Émise",
  PARTIALLY_PAID: "Partiellement payée",
  PAID: "Payée",
  CANCELLED: "Annulée",
};

const SOURCE_LABELS: Record<string, string> = {
  PLANNED_HOURS: "Heures prévues",
  ADHOC: "Ponctuel",
};

function formatDate(date: Date | null) {
  return date ? new Intl.DateTimeFormat("fr-FR").format(date) : "—";
}

function amount(value: unknown) {
  return `${Number(value).toFixed(2)} €`;
}

export default async function InvoiceDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ invoiceId: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { invoiceId } = await params;
  const { error } = await searchParams;
  const user = await requireSession();
  if (user.role !== "ADMIN") {
    redirect("/clients");
  }

  const invoice = await getInvoice(user, invoiceId);
  if (!invoice) {
    notFound();
  }

  const control =
    invoice.contract && invoice.periodYear && invoice.periodMonth
      ? await getValidatedHoursForContractMonth(
          user,
          invoice.contract.siteId,
          invoice.periodYear,
          invoice.periodMonth,
        )
      : null;

  const totalPaid = invoice.payments.reduce((sum, payment) => sum + Number(payment.amount), 0);
  const balanceDue = Number(invoice.amountTTC) - totalPaid;

  return (
    <div className="max-w-3xl space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">{invoice.number ?? "Brouillon"}</h1>
          <p className="text-sm text-zinc-500">
            {invoice.client.legalName}
            {invoice.contract ? ` — ${invoice.contract.reference}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm">{STATUS_LABELS[invoice.status] ?? invoice.status}</span>
          <a
            href={`/api/invoices/${invoice.id}/pdf`}
            target="_blank"
            rel="noreferrer"
            className="rounded border border-zinc-300 px-3 py-2 text-sm hover:bg-zinc-50"
          >
            PDF
          </a>
          {invoice.status === "DRAFT" && (
            <form action={issueInvoiceAction.bind(null, invoice.id)}>
              <button
                type="submit"
                className="rounded bg-zinc-900 px-3 py-2 text-sm text-white hover:bg-zinc-800"
              >
                Émettre
              </button>
            </form>
          )}
        </div>
      </div>

      {error && (
        <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
        <dt className="text-zinc-500">Émise le</dt>
        <dd>{formatDate(invoice.issuedOn)}</dd>
        <dt className="text-zinc-500">Échéance</dt>
        <dd>{formatDate(invoice.dueOn)}</dd>
        <dt className="text-zinc-500">Période facturée</dt>
        <dd>
          {invoice.periodMonth && invoice.periodYear
            ? `${String(invoice.periodMonth).padStart(2, "0")}/${invoice.periodYear}`
            : "—"}
        </dd>
      </dl>

      <div>
        <h2 className="text-sm font-medium text-zinc-700">Lignes</h2>
        <table className="mt-2 w-full text-left text-sm">
          <thead>
            <tr className="border-b border-zinc-200 text-zinc-500">
              <th className="py-2 font-medium">Désignation</th>
              <th className="font-medium">Type</th>
              <th className="font-medium">Qté</th>
              <th className="font-medium">PU HT</th>
              <th className="font-medium">TVA</th>
              <th className="font-medium">Total HT</th>
            </tr>
          </thead>
          <tbody>
            {invoice.lines.map((line) => (
              <tr key={line.id} className="border-b border-zinc-100">
                <td className="py-2">{line.label}</td>
                <td className="text-zinc-600">{SOURCE_LABELS[line.source] ?? line.source}</td>
                <td className="text-zinc-600">{Number(line.quantity).toFixed(2)}</td>
                <td className="text-zinc-600">{amount(line.unitPriceHT)}</td>
                <td className="text-zinc-600">{Number(line.vatRate).toFixed(0)} %</td>
                <td className="text-zinc-600">
                  {amount(Number(line.quantity) * Number(line.unitPriceHT))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
          <dt className="text-zinc-500">Total HT</dt>
          <dd>{amount(invoice.amountHT)}</dd>
          <dt className="text-zinc-500">TVA</dt>
          <dd>{amount(invoice.vatAmount)}</dd>
          <dt className="text-zinc-500 font-medium">Total TTC</dt>
          <dd className="font-medium">{amount(invoice.amountTTC)}</dd>
        </dl>
      </div>

      {invoice.status === "DRAFT" && (
        <div>
          <h2 className="text-sm font-medium text-zinc-700">Ajouter une ligne ponctuelle</h2>
          <form
            action={addAdhocLineAction.bind(null, invoice.id)}
            className="mt-2 flex flex-wrap items-end gap-3"
          >
            <div>
              <label htmlFor="label" className="block text-xs text-zinc-500">
                Libellé
              </label>
              <input
                id="label"
                name="label"
                required
                className="rounded border border-zinc-300 px-2 py-1 text-sm"
              />
            </div>
            <div>
              <label htmlFor="quantity" className="block text-xs text-zinc-500">
                Quantité
              </label>
              <input
                id="quantity"
                name="quantity"
                type="number"
                step="0.01"
                min="0"
                required
                className="w-24 rounded border border-zinc-300 px-2 py-1 text-sm"
              />
            </div>
            <div>
              <label htmlFor="unitPriceHT" className="block text-xs text-zinc-500">
                PU HT (€)
              </label>
              <input
                id="unitPriceHT"
                name="unitPriceHT"
                type="number"
                step="0.01"
                min="0"
                required
                className="w-28 rounded border border-zinc-300 px-2 py-1 text-sm"
              />
            </div>
            <div>
              <label htmlFor="vatRate" className="block text-xs text-zinc-500">
                TVA (%)
              </label>
              <input
                id="vatRate"
                name="vatRate"
                type="number"
                step="0.01"
                defaultValue={20}
                className="w-20 rounded border border-zinc-300 px-2 py-1 text-sm"
              />
            </div>
            <button
              type="submit"
              className="rounded border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-50"
            >
              Ajouter
            </button>
          </form>
        </div>
      )}

      {control && (
        <div>
          <h2 className="text-sm font-medium text-zinc-700">
            Contrôle — heures pointées validées du mois (non facturées)
          </h2>
          <p className="text-sm text-zinc-600">
            {control.totalHours.toFixed(2)} h sur {control.entryCount} pointage(s) validé(s)
          </p>
        </div>
      )}

      {(invoice.status === "ISSUED" ||
        invoice.status === "PARTIALLY_PAID" ||
        invoice.status === "PAID") && (
        <div>
          <h2 className="text-sm font-medium text-zinc-700">Paiements</h2>
          <ul className="mt-2 divide-y divide-zinc-100 text-sm">
            {invoice.payments.map((payment) => (
              <li key={payment.id} className="py-2">
                {formatDate(payment.paidOn)} — {amount(payment.amount)} ({payment.method})
                {payment.reference ? ` — ${payment.reference}` : ""}
              </li>
            ))}
            {invoice.payments.length === 0 && (
              <li className="py-2 text-zinc-400">Aucun paiement pour l&apos;instant.</li>
            )}
          </ul>
          <p className="mt-1 text-sm text-zinc-500">
            Reste dû : {amount(Math.max(balanceDue, 0))}
          </p>

          {balanceDue > 0 && (
            <form
              action={recordPaymentAction.bind(null, invoice.id)}
              className="mt-3 flex flex-wrap items-end gap-3"
            >
              <div>
                <label htmlFor="paidOn" className="block text-xs text-zinc-500">
                  Date
                </label>
                <input
                  id="paidOn"
                  name="paidOn"
                  type="date"
                  required
                  className="rounded border border-zinc-300 px-2 py-1 text-sm"
                />
              </div>
              <div>
                <label htmlFor="amount" className="block text-xs text-zinc-500">
                  Montant (€)
                </label>
                <input
                  id="amount"
                  name="amount"
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  defaultValue={balanceDue.toFixed(2)}
                  className="w-28 rounded border border-zinc-300 px-2 py-1 text-sm"
                />
              </div>
              <div>
                <label htmlFor="method" className="block text-xs text-zinc-500">
                  Moyen
                </label>
                <select
                  id="method"
                  name="method"
                  className="rounded border border-zinc-300 px-2 py-1 text-sm"
                >
                  <option value="TRANSFER">Virement</option>
                  <option value="CHEQUE">Chèque</option>
                  <option value="CASH">Espèces</option>
                  <option value="OTHER">Autre</option>
                </select>
              </div>
              <div>
                <label htmlFor="reference" className="block text-xs text-zinc-500">
                  Référence
                </label>
                <input
                  id="reference"
                  name="reference"
                  className="rounded border border-zinc-300 px-2 py-1 text-sm"
                />
              </div>
              <button
                type="submit"
                className="rounded border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-50"
              >
                Enregistrer le paiement
              </button>
            </form>
          )}
        </div>
      )}

      <p>
        <Link href="/invoices" className="text-sm underline">
          Retour aux factures
        </Link>
      </p>
    </div>
  );
}
