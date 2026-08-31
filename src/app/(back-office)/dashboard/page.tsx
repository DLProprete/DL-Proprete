import Link from "next/link";
import { redirect } from "next/navigation";
import { requireSession } from "@/server/auth/session";
import {
  getUnstaffedShiftsTodayTomorrow,
  getLongOpenTimeEntries,
  getUnpaidIssuedInvoices,
  getContractsEndingSoon,
  suggestAgentsForShift,
} from "@/server/dashboard/queries";
import { formatTimeInParis } from "@/lib/dates";
import { SHIFT_STATUS_LABELS, SHIFT_STATUS_TONE } from "../planning/shift-labels";
import { Badge } from "@/components/badge";

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("fr-FR").format(date);
}

export default async function DashboardPage() {
  const user = await requireSession();
  if (user.role !== "ADMIN") {
    redirect("/clients");
  }

  const [unstaffedShifts, longOpenEntries, unpaidInvoices, endingContracts] = await Promise.all([
    getUnstaffedShiftsTodayTomorrow(user),
    getLongOpenTimeEntries(user),
    getUnpaidIssuedInvoices(user),
    getContractsEndingSoon(user),
  ]);

  const today = new Date();
  const unpaidTotal = unpaidInvoices.reduce((sum, invoice) => sum + Number(invoice.amountTTC), 0);
  const tiles = [
    { href: "/planning", value: String(unstaffedShifts.length), label: "Non pourvues (J / J+1)" },
    { href: "/time-entries", value: String(longOpenEntries.length), label: "Pointages ouverts > 12h" },
    { href: "/invoices", value: `${unpaidTotal.toFixed(2)} €`, label: "Factures impayées" },
    { href: "/contracts", value: String(endingContracts.length), label: "Contrats à renouveler" },
  ];

  const suggestionsByShiftId = new Map(
    await Promise.all(
      unstaffedShifts
        .filter((shift) => shift.status === "UNSTAFFED")
        .map(async (shift) => [shift.id, await suggestAgentsForShift(user, shift.id)] as const),
    ),
  );

  return (
    <div className="max-w-4xl space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-semibold">Tableau de bord</h1>
        <form
          action="/api/exports/time-entries"
          method="get"
          className="flex flex-wrap items-center gap-2"
        >
          <input
            type="number"
            name="year"
            defaultValue={today.getFullYear()}
            className="w-24 field field-sm"
          />
          <input
            type="number"
            name="month"
            min={1}
            max={12}
            defaultValue={today.getMonth() + 1}
            className="w-16 field field-sm"
          />
          <button
            type="submit"
            className="btn btn-secondary"
          >
            Export CSV pointages (comptable)
          </button>
        </form>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {tiles.map((tile) => (
          <Link
            key={tile.href}
            href={tile.href}
            className="card transition hover:border-brand-700 hover:shadow-sm"
          >
            <p className="text-2xl font-semibold text-zinc-900">{tile.value}</p>
            <p className="text-sm text-zinc-600">{tile.label}</p>
          </Link>
        ))}
      </div>

      <section>
        <h2 className="text-sm font-medium text-zinc-700">
          Vacations non pourvues — aujourd&apos;hui et demain
        </h2>
        <ul className="mt-2 divide-y divide-zinc-100 text-sm">
          {unstaffedShifts.map((shift) => {
            const suggestions = suggestionsByShiftId.get(shift.id);
            return (
              <li key={shift.id} className="py-2">
                {formatDate(shift.date)} · {shift.site.name} · {formatTimeInParis(shift.startAt)}–
                {formatTimeInParis(shift.endAt)}{" "}
                <Badge
                  tone={SHIFT_STATUS_TONE[shift.status] ?? "neutral"}
                  label={SHIFT_STATUS_LABELS[shift.status] ?? shift.status}
                />
                {suggestions && (
                  <p className="text-xs text-zinc-600">
                    {suggestions.length > 0
                      ? `Suggestions : ${suggestions
                          .map((agent) => `${agent.firstName} ${agent.lastName}`)
                          .join(", ")}`
                      : "Aucun agent compatible trouvé."}
                  </p>
                )}
              </li>
            );
          })}
          {unstaffedShifts.length === 0 && (
            <li className="py-2 text-zinc-500">Rien à signaler.</li>
          )}
        </ul>
      </section>

      <section>
        <h2 className="text-sm font-medium text-zinc-700">Pointages ouverts depuis plus de 12h</h2>
        <ul className="mt-2 divide-y divide-zinc-100 text-sm">
          {longOpenEntries.map((entry) => (
            <li key={entry.id} className="py-2">
              {entry.user.firstName} {entry.user.lastName} · {entry.site.name} · débuté à{" "}
              {formatTimeInParis(entry.clockInAt)} le {formatDate(entry.clockInAt)}
            </li>
          ))}
          {longOpenEntries.length === 0 && (
            <li className="py-2 text-zinc-500">Rien à signaler.</li>
          )}
        </ul>
      </section>

      <section>
        <h2 className="text-sm font-medium text-zinc-700">Factures émises impayées</h2>
        <ul className="mt-2 divide-y divide-zinc-100 text-sm">
          {unpaidInvoices.map((invoice) => {
            const overdue = invoice.dueOn && invoice.dueOn < today;
            return (
              <li key={invoice.id} className="py-2">
                <Link href={`/invoices/${invoice.id}`} className="underline">
                  {invoice.number}
                </Link>{" "}
                · {invoice.client.legalName} · {Number(invoice.amountTTC).toFixed(2)} € ·{" "}
                <span className={overdue ? "text-red-600" : "text-zinc-600"}>
                  échéance {invoice.dueOn ? formatDate(invoice.dueOn) : "—"}
                </span>
              </li>
            );
          })}
          {unpaidInvoices.length === 0 && (
            <li className="py-2 text-zinc-500">Rien à signaler.</li>
          )}
        </ul>
      </section>

      <section>
        <h2 className="text-sm font-medium text-zinc-700">
          Contrats qui expirent bientôt (sous préavis)
        </h2>
        <ul className="mt-2 divide-y divide-zinc-100 text-sm">
          {endingContracts.map((contract) => (
            <li key={contract.id} className="py-2">
              <Link href={`/contracts/${contract.id}`} className="underline">
                {contract.reference}
              </Link>{" "}
              · {contract.client.legalName} — {contract.site.name} · fin le{" "}
              {formatDate(contract.endsOn)}
            </li>
          ))}
          {endingContracts.length === 0 && (
            <li className="py-2 text-zinc-500">Rien à signaler.</li>
          )}
        </ul>
      </section>
    </div>
  );
}
