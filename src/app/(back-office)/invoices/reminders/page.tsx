import Link from "next/link";
import { redirect } from "next/navigation";
import { requireSession } from "@/server/auth/session";
import { listInvoicesForReminders } from "@/server/billing/reminders";
import { parisToday } from "@/lib/dates";
import { markInvoiceRemindedAction } from "../actions";
import { sendInvoiceReminderAction } from "../mail-actions";

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("fr-FR").format(date);
}

function amount(value: number) {
  return `${value.toFixed(2)} €`;
}

export default async function InvoiceRemindersPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; sent?: string }>;
}) {
  const { error, sent } = await searchParams;
  const user = await requireSession();
  if (user.role !== "ADMIN") redirect("/");

  const invoices = await listInvoicesForReminders(user);
  const today = parisToday();
  const todayValue = `${today.year}-${String(today.month).padStart(2, "0")}-${String(today.day).padStart(2, "0")}`;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Relances</h1>
        <Link href="/invoices" className="text-sm underline">Retour aux factures</Link>
      </div>
      <p className="text-sm text-zinc-600">
        Factures émises ou partiellement payées, échéance dépassée ou proche.
        L'envoi e-mail choisit automatiquement J+5 ou J+15 selon le retard.
      </p>
      {sent && (
        <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
          Relance envoyée par e-mail.
        </p>
      )}
      {error && <p className="alert alert-danger">{error}</p>}
      <div className="card-table">
        <table>
          <thead>
            <tr>
              <th>Numéro</th>
              <th>Client</th>
              <th>Échéance</th>
              <th>Restant dû</th>
              <th>Dernière relance</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((invoice) => (
              <tr key={invoice.id} className="align-top">
                <td>
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
                <td className="space-y-2">
                  <form action={sendInvoiceReminderAction.bind(null, invoice.id)}>
                    <button type="submit" className="btn btn-dark btn-xs">Envoyer relance e-mail</button>
                  </form>
                  <form action={markInvoiceRemindedAction.bind(null, invoice.id)} className="flex flex-wrap items-end gap-2">
                    <input type="date" name="remindedOn" required defaultValue={todayValue} className="field field-sm text-xs" />
                    <input type="text" name="note" placeholder="Note (facultatif)" maxLength={200} className="field field-sm text-xs" />
                    <button type="submit" className="btn btn-secondary btn-xs">Marquer relancé</button>
                  </form>
                </td>
              </tr>
            ))}
            {invoices.length === 0 && (
              <tr>
                <td colSpan={6} className="text-zinc-500">Aucune relance à faire.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
