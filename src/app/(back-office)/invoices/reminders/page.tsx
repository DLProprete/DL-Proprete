import Link from "next/link";
import { redirect } from "next/navigation";
import { requireSession } from "@/server/auth/session";
import { listInvoicesForReminders } from "@/server/billing/reminders";
import { parisToday } from "@/lib/dates";
import { markInvoiceRemindedAction } from "../actions";

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("fr-FR").format(date);
}

function amount(value: number) {
  return `${value.toFixed(2)} €`;
}

export default async function InvoiceRemindersPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const user = await requireSession();
  if (user.role !== "ADMIN") {
    redirect("/");
  }

  const invoices = await listInvoicesForReminders(user);
  const today = parisToday();
  const todayValue = `${today.year}-${String(today.month).padStart(2, "0")}-${String(today.day).padStart(2, "0")}`;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Relances</h1>
        <Link href="/invoices" className="text-sm underline">
          Retour aux factures
        </Link>
      </div>
      <p className="text-sm text-zinc-600">
        Factures émises ou partiellement payées, échéance dépassée ou dans les 7 prochains jours.
      </p>
      {error && (
        <p className="alert alert-danger">
          {error}
        </p>
      )}

      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-zinc-200 text-zinc-600">
            <th className="py-2 font-medium">Numéro</th>
            <th className="font-medium">Client</th>
            <th className="font-medium">Échéance</th>
            <th className="font-medium">Restant dû</th>
            <th className="font-medium">Dernière relance</th>
            <th className="font-medium">Marquer relancé</th>
          </tr>
        </thead>
        <tbody>
          {invoices.map((invoice) => (
            <tr key={invoice.id} className="border-b border-zinc-100 align-top">
              <td className="py-2">
                <Link href={`/invoices/${invoice.id}`} className="text-zinc-900 underline">
                  {invoice.number ?? invoice.id}
                </Link>
              </td>
              <td className="text-zinc-600">{invoice.client.legalName}</td>
              <td className="text-zinc-600">{formatDate(invoice.dueOn)}</td>
              <td className="text-zinc-600">{amount(invoice.balanceDue)}</td>
              <td className="text-zinc-600">
                {invoice.lastRemindedAt ? formatDate(invoice.lastRemindedAt) : "—"}
              </td>
              <td>
                <form
                  action={markInvoiceRemindedAction.bind(null, invoice.id)}
                  className="flex flex-wrap items-end gap-2"
                >
                  <input
                    type="date"
                    name="remindedOn"
                    required
                    defaultValue={todayValue}
                    className="field field-sm text-xs"
                  />
                  <input
                    type="text"
                    name="note"
                    placeholder="Note (facultatif)"
                    maxLength={200}
                    className="field field-sm text-xs"
                  />
                  <button
                    type="submit"
                    className="btn btn-secondary btn-xs"
                  >
                    Marquer relancé le
                  </button>
                </form>
              </td>
            </tr>
          ))}
          {invoices.length === 0 && (
            <tr>
              <td colSpan={6} className="py-4 text-zinc-500">
                Aucune relance à faire.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
