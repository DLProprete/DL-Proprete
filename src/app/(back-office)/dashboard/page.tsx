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
import { listAgents } from "@/server/planning/queries";
import { formatTimeInParis } from "@/lib/dates";
import { assignAgentAction } from "../planning/actions";

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("fr-FR").format(date);
}

// Le tableau de bord est une liste de choses à faire, pas un tableau de
// scores : chaque section se lit de haut en bas dans l'ordre d'urgence, et
// tout ce qui peut être traité ici l'est ici. La première version envoyait
// vers le planning pour affecter un agent alors qu'elle savait déjà lequel
// proposer — c'était le principal défaut d'ergonomie de l'outil.
function Section({
  title,
  count,
  children,
}: {
  title: string;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-zinc-200 bg-white">
      <h2 className="flex items-baseline gap-2 border-b border-zinc-200 px-4 py-2.5 text-sm font-semibold text-zinc-800">
        {title}
        {count > 0 && <span className="num text-xs font-normal text-zinc-500">{count}</span>}
      </h2>
      {count === 0 ? (
        <p className="px-4 py-3 text-sm text-zinc-500">Rien à signaler.</p>
      ) : (
        <ul className="divide-y divide-zinc-100">{children}</ul>
      )}
    </section>
  );
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const user = await requireSession();
  if (user.role !== "ADMIN") {
    redirect("/clients");
  }

  const [unstaffedShifts, longOpenEntries, unpaidInvoices, endingContracts, agents] =
    await Promise.all([
      getUnstaffedShiftsTodayTomorrow(user),
      getLongOpenTimeEntries(user),
      getUnpaidIssuedInvoices(user),
      getContractsEndingSoon(user),
      listAgents(user),
    ]);

  const today = new Date();
  const unpaidTotal = unpaidInvoices.reduce((sum, invoice) => sum + Number(invoice.amountTTC), 0);
  const overdueCount = unpaidInvoices.filter(
    (invoice) => invoice.dueOn && invoice.dueOn < today,
  ).length;

  // La couleur ne sort que quand il y a quelque chose à faire : un compteur
  // à zéro reste neutre, sinon l'œil ne repère plus ce qui compte.
  const counters = [
    {
      href: "/planning",
      value: String(unstaffedShifts.length),
      label: "non pourvues (J / J+1)",
      alert: unstaffedShifts.length > 0,
    },
    {
      href: "/time-entries",
      value: String(longOpenEntries.length),
      label: "pointages ouverts > 12 h",
      alert: longOpenEntries.length > 0,
    },
    {
      href: "/invoices",
      value: `${unpaidTotal.toFixed(2)} €`,
      label: overdueCount > 0 ? `impayées, dont ${overdueCount} en retard` : "impayées",
      alert: overdueCount > 0,
    },
    {
      href: "/contracts",
      value: String(endingContracts.length),
      label: "contrats à renouveler",
      alert: endingContracts.length > 0,
    },
  ];

  const suggestionsByShiftId = new Map(
    await Promise.all(
      unstaffedShifts.map(
        async (shift) => [shift.id, await suggestAgentsForShift(user, shift.id)] as const,
      ),
    ),
  );

  return (
    <div className="max-w-5xl space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-semibold">Tableau de bord</h1>
        <form
          action="/api/exports/time-entries"
          method="get"
          className="flex flex-wrap items-center gap-2 text-sm"
        >
          <span className="text-zinc-600">Export pointages</span>
          <input
            type="number"
            name="year"
            aria-label="Année"
            defaultValue={today.getFullYear()}
            className="w-20 field field-sm"
          />
          <input
            type="number"
            name="month"
            min={1}
            max={12}
            aria-label="Mois"
            defaultValue={today.getMonth() + 1}
            className="w-14 field field-sm"
          />
          <button type="submit" className="btn btn-secondary btn-sm">
            CSV comptable
          </button>
        </form>
      </div>

      {error && (
        <p className="alert alert-danger">
          {error === "conflict"
            ? "Affectation refusée : conflit d'horaire avec une autre vacation, ou agent invalide."
            : `Affectation refusée — ${error}`}
        </p>
      )}

      <div className="flex flex-wrap divide-x divide-zinc-200 overflow-hidden rounded-lg border border-zinc-200 bg-white">
        {counters.map((counter) => (
          <Link
            key={counter.href}
            href={counter.href}
            className="flex min-w-44 flex-1 items-baseline gap-2 px-4 py-3 transition-colors hover:bg-zinc-50"
          >
            <span
              className={`num text-lg font-semibold ${
                counter.alert ? "text-amber-700" : "text-zinc-900"
              }`}
            >
              {counter.value}
            </span>
            <span className="text-sm text-zinc-600">{counter.label}</span>
          </Link>
        ))}
      </div>

      <Section
        title="Vacations non pourvues — aujourd'hui et demain"
        count={unstaffedShifts.length}
      >
        {unstaffedShifts.map((shift) => {
          const suggestions = suggestionsByShiftId.get(shift.id) ?? [];
          return (
            <li
              key={shift.id}
              className="flex flex-col gap-3 border-l-2 border-l-amber-500 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="text-sm">
                <p className="font-medium text-zinc-900">
                  {shift.site.name}{" "}
                  <span className="num font-normal text-zinc-600">
                    {formatDate(shift.date)} · {formatTimeInParis(shift.startAt)}–
                    {formatTimeInParis(shift.endAt)}
                  </span>
                </p>
                <p className="mt-0.5 text-xs text-zinc-600">
                  {suggestions.length > 0
                    ? `Disponibles : ${suggestions
                        .map((agent) => `${agent.firstName} ${agent.lastName}`)
                        .join(", ")}`
                    : "Aucun agent disponible sur ce créneau."}
                </p>
              </div>

              {/* Affectation directement ici : le premier agent disponible est
                  présélectionné, un clic suffit dans le cas courant. */}
              <form
                action={assignAgentAction.bind(null, shift.id, "/dashboard")}
                className="flex shrink-0 items-center gap-2"
              >
                <select
                  name="agentUserId"
                  required
                  aria-label={`Affecter un agent — ${shift.site.name}`}
                  defaultValue={suggestions[0]?.id ?? ""}
                  className="field field-sm min-h-9"
                >
                  <option value="" disabled>
                    Affecter…
                  </option>
                  {agents.map((agent) => (
                    <option key={agent.id} value={agent.id}>
                      {agent.firstName} {agent.lastName}
                      {suggestions.some((s) => s.id === agent.id) ? "" : " (indisponible)"}
                    </option>
                  ))}
                </select>
                <button type="submit" className="btn btn-primary btn-sm">
                  Affecter
                </button>
              </form>
            </li>
          );
        })}
      </Section>

      <Section title="Factures émises impayées" count={unpaidInvoices.length}>
        {unpaidInvoices.map((invoice) => {
          const overdue = invoice.dueOn && invoice.dueOn < today;
          return (
            <li
              key={invoice.id}
              className={`flex items-baseline justify-between gap-4 px-4 py-2.5 text-sm ${
                overdue ? "border-l-2 border-l-red-500" : ""
              }`}
            >
              <span>
                <Link href={`/invoices/${invoice.id}`} className="font-medium underline">
                  {invoice.number}
                </Link>{" "}
                <span className="text-zinc-600">{invoice.client.legalName}</span>
              </span>
              <span className="num shrink-0 text-right">
                {Number(invoice.amountTTC).toFixed(2)} €{" "}
                <span className={overdue ? "text-red-700" : "text-zinc-600"}>
                  · échéance {invoice.dueOn ? formatDate(invoice.dueOn) : "—"}
                </span>
              </span>
            </li>
          );
        })}
      </Section>

      <Section title="Pointages ouverts depuis plus de 12 h" count={longOpenEntries.length}>
        {longOpenEntries.map((entry) => (
          <li key={entry.id} className="px-4 py-2.5 text-sm">
            <span className="font-medium text-zinc-900">
              {entry.user.firstName} {entry.user.lastName}
            </span>{" "}
            <span className="num text-zinc-600">
              {entry.site.name} · débuté à {formatTimeInParis(entry.clockInAt)} le{" "}
              {formatDate(entry.clockInAt)}
            </span>
          </li>
        ))}
      </Section>

      <Section title="Contrats qui expirent bientôt" count={endingContracts.length}>
        {endingContracts.map((contract) => (
          <li key={contract.id} className="px-4 py-2.5 text-sm">
            <Link href={`/contracts/${contract.id}`} className="font-medium underline">
              {contract.reference}
            </Link>{" "}
            <span className="num text-zinc-600">
              {contract.client.legalName} — {contract.site.name} · fin le{" "}
              {formatDate(contract.endsOn)}
            </span>
          </li>
        ))}
      </Section>
    </div>
  );
}
