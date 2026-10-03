import Link from "next/link";
import { UserX, ReceiptEuro, FileClock, Wallet } from "lucide-react";
import { redirect } from "next/navigation";
import { requireSession } from "@/server/auth/session";
import {
  getUnstaffedShiftsTodayTomorrow,
  getUnpaidIssuedInvoices,
  getContractsEndingSoon,
  getMonthlyRevenue,
  suggestAgentsForShift,
} from "@/server/dashboard/queries";
import { listAgents } from "@/server/planning/queries";
import { formatLongDateParis, formatTimeInParis } from "@/lib/dates";
import { prisma } from "@/lib/prisma";
import { assignAgentAction } from "../planning/actions";
import { EmptyState } from "@/components/empty-state";

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("fr-FR").format(date);
}

const EXPERIENCE_LABELS: Record<string, string> = {
  JUNIOR: "débutant",
  CONFIRMED: "confirmé",
  SENIOR: "expérimenté",
};

function describeSuggestion(agent: {
  firstName: string;
  lastName: string;
  experienceLevel: string | null;
  distanceKm: number | null;
}) {
  const details = [
    agent.experienceLevel ? EXPERIENCE_LABELS[agent.experienceLevel] : null,
    agent.distanceKm != null ? `${Math.round(agent.distanceKm)} km` : null,
  ].filter(Boolean);
  const name = `${agent.firstName} ${agent.lastName}`;
  return details.length > 0 ? `${name} (${details.join(", ")})` : name;
}

// Le tableau de bord est une liste de choses à faire, pas un tableau de
// scores : chaque section se lit de haut en bas dans l'ordre d'urgence, et
// tout ce qui peut être traité ici l'est ici. La première version envoyait
// vers le planning pour affecter un agent alors qu'elle savait déjà lequel
// proposer — c'était le principal défaut d'ergonomie de l'outil.
function Section({
  title,
  count,
  icon,
  children,
}: {
  title: string;
  count: number;
  icon: "batiment" | "industriel" | "produits" | "intervention";
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-zinc-200 bg-white">
      <h2 className="flex items-baseline gap-2 border-b border-zinc-200 px-4 py-2.5 text-sm font-semibold text-zinc-800">
        {title}
        {count > 0 && <span className="num text-xs font-normal text-zinc-500">{count}</span>}
      </h2>
      {count === 0 ? (
        <EmptyState icon={icon}>Rien à signaler.</EmptyState>
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

  const [unstaffedShifts, unpaidInvoices, endingContracts, revenue, agents, me] =
    await Promise.all([
      getUnstaffedShiftsTodayTomorrow(user),
      getUnpaidIssuedInvoices(user),
      getContractsEndingSoon(user),
      getMonthlyRevenue(user),
      listAgents(user),
      prisma.user.findUniqueOrThrow({ where: { id: user.id }, select: { firstName: true } }),
    ]);

  const today = new Date();
  const unpaidTotal = unpaidInvoices.reduce((sum, invoice) => sum + Number(invoice.amountTTC), 0);
  const overdueCount = unpaidInvoices.filter(
    (invoice) => invoice.dueOn && invoice.dueOn < today,
  ).length;
  const revenueDelta =
    revenue.previousMonthHT > 0
      ? ((revenue.currentMonthHT - revenue.previousMonthHT) / revenue.previousMonthHT) * 100
      : null;

  // La couleur d'état (ambre sur la valeur) ne sort que quand il y a quelque
  // chose à faire : un compteur à zéro reste en encre neutre. La pastille
  // d'icône est monochrome marine : une identité de carte, pas une alerte.
  const counters = [
    {
      href: "/planning",
      icon: UserX,
      value: String(unstaffedShifts.length),
      label: "Vacations non pourvues (J / J+1)",
      alert: unstaffedShifts.length > 0,
    },
    {
      href: "/invoices",
      icon: ReceiptEuro,
      value: `${unpaidTotal.toFixed(2)} €`,
      label: overdueCount > 0 ? `Impayées, dont ${overdueCount} en retard` : "Factures impayées",
      alert: overdueCount > 0,
    },
    {
      href: "/contracts",
      icon: FileClock,
      value: String(endingContracts.length),
      label: "Contrats à renouveler",
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
        <div>
          <p className="text-sm text-zinc-600">Tableau de bord · {formatLongDateParis(today)}</p>
          <h1 className="text-2xl font-semibold">Bonjour, {me.firstName}</h1>
        </div>
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

      <div className="stat-card max-w-xs !cursor-default hover:bg-white">
        <span className="stat-badge">
          <Wallet size={18} strokeWidth={2} aria-hidden />
        </span>
        <span className="num text-2xl font-semibold text-zinc-900">
          {revenue.currentMonthHT.toFixed(2)} €
        </span>
        <span className="text-sm text-zinc-600">
          CA facturé ce mois-ci
          {revenueDelta !== null && (
            <span className={revenueDelta >= 0 ? "text-emerald-700" : "text-zinc-500"}>
              {" "}
              · {revenueDelta >= 0 ? "+" : ""}
              {revenueDelta.toFixed(0)} % vs mois dernier
            </span>
          )}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {counters.map((counter) => (
          <Link key={counter.href} href={counter.href} className="stat-card">
            <span className="stat-badge">
              <counter.icon size={18} strokeWidth={2} aria-hidden />
            </span>
            <span
              className={`num text-2xl font-semibold ${
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
        icon="intervention"
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
                    ? `Disponibles : ${suggestions.map(describeSuggestion).join(", ")}`
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
                  {agents.map((agent) => {
                    // Un agent en conflit d'horaire ou en absence approuvée est
                    // refusé par le serveur : le proposer quand même mènerait à
                    // un aller-retour et un message d'erreur pour rien.
                    const available = suggestions.some((s) => s.id === agent.id);
                    return (
                      <option key={agent.id} value={agent.id} disabled={!available}>
                        {agent.firstName} {agent.lastName}
                        {available ? "" : " — indisponible"}
                      </option>
                    );
                  })}
                </select>
                <button type="submit" className="btn btn-primary btn-sm">
                  Affecter
                </button>
              </form>
            </li>
          );
        })}
      </Section>

      <Section title="Factures émises impayées" count={unpaidInvoices.length} icon="produits">
        {unpaidInvoices.map((invoice) => {
          const overdue = invoice.dueOn && invoice.dueOn < today;
          return (
            <li
              key={invoice.id}
              className={`flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-4 py-2.5 text-sm ${
                overdue ? "border-l-2 border-l-red-500" : ""
              }`}
            >
              <span className="min-w-0">
                <Link href={`/invoices/${invoice.id}`} className="font-medium underline">
                  {invoice.number}
                </Link>{" "}
                <span className="text-zinc-600">{invoice.client.legalName}</span>
              </span>
              {/* Pas de shrink-0 : sur petit écran + gros texte, le bloc passe à la ligne
                  (flex-wrap) puis son texte peut lui-même se replier au lieu de déborder. */}
              <span className="num ml-auto max-w-full text-right">
                {Number(invoice.amountTTC).toFixed(2)} €{" "}
                <span className={overdue ? "text-red-700" : "text-zinc-600"}>
                  · échéance {invoice.dueOn ? formatDate(invoice.dueOn) : "—"}
                </span>
              </span>
            </li>
          );
        })}
      </Section>

      <Section title="Contrats qui expirent bientôt" count={endingContracts.length} icon="batiment">
        {endingContracts.map((contract) => (
          <li key={contract.id} className="px-4 py-2.5 text-sm">
            <Link href={`/contracts/${contract.id}`} className="font-medium underline">
              {contract.reference}
            </Link>{" "}
            <span className="num text-zinc-600">
              {contract.client.legalName} —{" "}
              {contract.contractSites.map((cs) => cs.site.name).join(", ")} · fin le{" "}
              {formatDate(contract.endsOn)}
            </span>
          </li>
        ))}
      </Section>
    </div>
  );
}
