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
      <p className="text-sm text-zinc-500">
        Factures émises ou partiellement payées, échéance dépassée ou dans les 7 prochains jours.
      </p>
      {error && (
        <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-zinc-200 text-zinc-500">
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
              <td className="text-zinc-500">
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
                    className="rounded border border-zinc-300 px-2 py-1 text-xs"
                  />
                  <input
                    type="text"
                    name="note"
                    placeholder="Note (facultatif)"
                    maxLength={200}
                    className="rounded border border-zinc-300 px-2 py-1 text-xs"
                  />
                  <button
                    type="submit"
                    className="rounded border border-zinc-300 px-2 py-1 text-xs hover:bg-zinc-50"
                  >
                    Marquer relancé le
                  </button>
                </form>
              </td>
            </tr>
          ))}
          {invoices.length === 0 && (
            <tr>
              <td colSpan={6} className="py-4 text-zinc-400">
                Aucune relance à faire.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
