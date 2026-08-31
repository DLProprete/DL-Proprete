import Link from "next/link";
import { requireSession } from "@/server/auth/session";
import { listTimeEntriesForReview, listAgentsForReview } from "@/server/time/review";
import { listSites } from "@/server/sites/queries";
import { reviewFlags } from "@/server/time/review-flags";
import { addDays, formatTimeInParis, parseDateOnly } from "@/lib/dates";
import { SelectAllCheckbox } from "@/components/select-all-checkbox";
import { validateTimeEntryAction, rejectTimeEntryAction, validateSelectedAction } from "./actions";

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" }).format(
    date,
  );
}

function formatDeviation(minutes: number | null) {
  if (minutes === null) return "hors planning";
  if (Math.abs(minutes) < 1) return "à l'heure";
  const sign = minutes > 0 ? "+" : "";
  return `${sign}${Math.round(minutes)} min`;
}

export default async function TimeEntriesReviewPage({
  searchParams,
}: {
  searchParams: Promise<{
    userId?: string;
    siteId?: string;
    from?: string;
    to?: string;
    page?: string;
    anomaliesFirst?: string;
  }>;
}) {
  const { userId, siteId, from, to, page, anomaliesFirst } = await searchParams;
  const user = await requireSession();

  const [agents, sites, result] = await Promise.all([
    listAgentsForReview(user),
    listSites(user),
    listTimeEntriesForReview(user, {
      userId: userId || undefined,
      siteId: siteId || undefined,
      from: from ? parseDateOnly(from) : undefined,
      to: to ? addDays(parseDateOnly(to), 1) : undefined,
      page: page ? Number(page) : 1,
    }),
  ]);

  const { items, total, page: currentPage, pageSize } = result;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const showAnomaliesFirst = anomaliesFirst === "1";

  const rows = items.map((entry) => ({ entry, flags: reviewFlags(entry) }));
  if (showAnomaliesFirst) {
    rows.sort((a, b) => Number(b.flags.isAnomaly) - Number(a.flags.isAnomaly));
  }

  function pageHref(targetPage: number) {
    const params = new URLSearchParams();
    if (userId) params.set("userId", userId);
    if (siteId) params.set("siteId", siteId);
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    if (showAnomaliesFirst) params.set("anomaliesFirst", "1");
    params.set("page", String(targetPage));
    return `/time-entries?${params.toString()}`;
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Pointages à valider</h1>

      <form method="get" className="flex flex-wrap items-end gap-3 text-sm">
        <div>
          <label htmlFor="userId" className="block text-xs text-zinc-600">
            Agent
          </label>
          <select
            id="userId"
            name="userId"
            defaultValue={userId ?? ""}
            className="mt-1 field field-sm"
          >
            <option value="">Tous</option>
            {agents.map((agent) => (
              <option key={agent.id} value={agent.id}>
                {agent.firstName} {agent.lastName}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="siteId" className="block text-xs text-zinc-600">
            Site
          </label>
          <select
            id="siteId"
            name="siteId"
            defaultValue={siteId ?? ""}
            className="mt-1 field field-sm"
          >
            <option value="">Tous</option>
            {sites.map((site) => (
              <option key={site.id} value={site.id}>
                {site.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="from" className="block text-xs text-zinc-600">
            Du
          </label>
          <input
            id="from"
            name="from"
            type="date"
            defaultValue={from ?? ""}
            className="mt-1 field field-sm"
          />
        </div>
        <div>
          <label htmlFor="to" className="block text-xs text-zinc-600">
            Au
          </label>
          <input
            id="to"
            name="to"
            type="date"
            defaultValue={to ?? ""}
            className="mt-1 field field-sm"
          />
        </div>
        <label className="flex items-center gap-2 pb-2 text-zinc-700">
          <input type="checkbox" name="anomaliesFirst" value="1" defaultChecked={showAnomaliesFirst} className="h-4 w-4" />
          Anomalies d&apos;abord
        </label>
        <button type="submit" className="btn btn-secondary">
          Filtrer
        </button>
      </form>

      <form action={validateSelectedAction} className="space-y-2">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-zinc-200 text-zinc-600">
              <th className="py-2 font-medium">
                <SelectAllCheckbox targetName="ids" />
              </th>
              <th className="font-medium">Agent</th>
              <th className="font-medium">Site</th>
              <th className="font-medium">Date</th>
              <th className="font-medium">Début</th>
              <th className="font-medium">Fin</th>
              <th className="font-medium">Durée</th>
              <th className="font-medium">Écart</th>
              <th className="font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ entry, flags }) => (
              <tr
                key={entry.id}
                className={`border-b border-zinc-100 ${flags.isAnomaly ? "bg-amber-50" : ""}`}
              >
                <td className="py-2">
                  <input type="checkbox" name="ids" value={entry.id} className="h-4 w-4" />
                </td>
                <td>
                  {entry.user.firstName} {entry.user.lastName}
                </td>
                <td className="text-zinc-600">{entry.site.name}</td>
                <td className="text-zinc-600">{formatDate(entry.clockInAt)}</td>
                <td className="text-zinc-600">{formatTimeInParis(entry.clockInAt)}</td>
                <td className="text-zinc-600">
                  {entry.clockOutAt ? formatTimeInParis(entry.clockOutAt) : "—"}
                </td>
                <td className="text-zinc-600">
                  {flags.durationMinutes !== null ? `${Math.round(flags.durationMinutes)} min` : "—"}
                </td>
                <td className={flags.isAnomaly ? "font-medium text-amber-800" : "text-zinc-600"}>
                  {formatDeviation(flags.startDeviationMinutes)}
                </td>
                <td>
                  {/* formAction (pas un <form> imbriqué : invalide en HTML,
                      la ligne est déjà dans le <form> de validation en masse) —
                      chaque bouton soumet vers sa propre Server Action. */}
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      formAction={validateTimeEntryAction.bind(null, entry.id)}
                      className="text-xs text-green-700 underline"
                    >
                      Valider
                    </button>
                    <button
                      type="submit"
                      formAction={rejectTimeEntryAction.bind(null, entry.id)}
                      className="text-xs text-red-600 underline"
                    >
                      Rejeter
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={9} className="py-4 text-zinc-500">
                  Aucun pointage à valider pour ces filtres.{" "}
                  <Link href="/planning" className="underline">
                    Ouvrir le planning
                  </Link>
                </td>
              </tr>
            )}
          </tbody>
        </table>
        {rows.length > 0 && (
          <button
            type="submit"
            className="btn btn-primary"
          >
            Valider la sélection
          </button>
        )}
      </form>

      <div className="flex items-center justify-between text-sm">
        {currentPage > 1 ? (
          <Link href={pageHref(currentPage - 1)} className="underline">
            &larr; Page précédente
          </Link>
        ) : (
          <span className="text-zinc-300">&larr; Page précédente</span>
        )}
        <span className="text-zinc-600">
          Page {currentPage} / {totalPages} ({total} pointage{total > 1 ? "s" : ""})
        </span>
        {currentPage < totalPages ? (
          <Link href={pageHref(currentPage + 1)} className="underline">
            Page suivante &rarr;
          </Link>
        ) : (
          <span className="text-zinc-300">Page suivante &rarr;</span>
        )}
      </div>
    </div>
  );
}
