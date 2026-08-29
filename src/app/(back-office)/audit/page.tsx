import Link from "next/link";
import { redirect } from "next/navigation";
import { requireSession } from "@/server/auth/session";
import { listAuditLogs, listActors } from "@/server/audit/queries";
import { addDays, parseDateOnly } from "@/lib/dates";
import { AUDIT_ACTION_LABELS } from "./action-labels";
import type { AuditAction } from "@/server/audit/log";

const dateTimeFormatter = new Intl.DateTimeFormat("fr-FR", {
  timeZone: "Europe/Paris",
  dateStyle: "short",
  timeStyle: "short",
});

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; actorUserId?: string; action?: string; page?: string }>;
}) {
  const { from, to, actorUserId, action, page } = await searchParams;
  const user = await requireSession();
  if (user.role !== "ADMIN") {
    redirect("/");
  }

  const [actors, result] = await Promise.all([
    listActors(user),
    listAuditLogs(user, {
      from: from ? parseDateOnly(from) : undefined,
      to: to ? addDays(parseDateOnly(to), 1) : undefined,
      actorUserId: actorUserId || undefined,
      action: (action || undefined) as AuditAction | undefined,
      page: page ? Number(page) : 1,
    }),
  ]);

  const { items, total, page: currentPage, pageSize } = result;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  function pageHref(targetPage: number) {
    const params = new URLSearchParams();
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    if (actorUserId) params.set("actorUserId", actorUserId);
    if (action) params.set("action", action);
    params.set("page", String(targetPage));
    return `/audit?${params.toString()}`;
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Journal d&apos;audit</h1>

      <form method="get" className="flex flex-wrap items-end gap-3 text-sm">
        <div>
          <label htmlFor="from" className="block text-xs text-zinc-500">
            Du
          </label>
          <input
            id="from"
            name="from"
            type="date"
            defaultValue={from ?? ""}
            className="mt-1 rounded border border-zinc-300 px-2 py-1"
          />
        </div>
        <div>
          <label htmlFor="to" className="block text-xs text-zinc-500">
            Au
          </label>
          <input
            id="to"
            name="to"
            type="date"
            defaultValue={to ?? ""}
            className="mt-1 rounded border border-zinc-300 px-2 py-1"
          />
        </div>
        <div>
          <label htmlFor="actorUserId" className="block text-xs text-zinc-500">
            Acteur
          </label>
          <select
            id="actorUserId"
            name="actorUserId"
            defaultValue={actorUserId ?? ""}
            className="mt-1 rounded border border-zinc-300 px-2 py-1"
          >
            <option value="">Tous</option>
            {actors.map((actor) => (
              <option key={actor.id} value={actor.id}>
                {actor.firstName} {actor.lastName}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="action" className="block text-xs text-zinc-500">
            Type
          </label>
          <select
            id="action"
            name="action"
            defaultValue={action ?? ""}
            className="mt-1 rounded border border-zinc-300 px-2 py-1"
          >
            <option value="">Tous</option>
            {Object.entries(AUDIT_ACTION_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <button type="submit" className="rounded border border-zinc-300 px-3 py-2 hover:bg-zinc-50">
          Filtrer
        </button>
      </form>

      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-zinc-200 text-zinc-500">
            <th className="py-2 font-medium">Date</th>
            <th className="font-medium">Acteur</th>
            <th className="font-medium">Type</th>
            <th className="font-medium">Résumé</th>
          </tr>
        </thead>
        <tbody>
          {items.map((log) => (
            <tr key={log.id} className="border-b border-zinc-100">
              <td className="py-2 whitespace-nowrap text-zinc-500">{dateTimeFormatter.format(log.createdAt)}</td>
              <td className="whitespace-nowrap">
                {log.actor ? `${log.actor.firstName} ${log.actor.lastName}` : "—"}
              </td>
              <td className="whitespace-nowrap text-zinc-600">
                {AUDIT_ACTION_LABELS[log.action] ?? log.action}
              </td>
              <td className="text-zinc-700">{log.summary}</td>
            </tr>
          ))}
          {items.length === 0 && (
            <tr>
              <td colSpan={4} className="py-4 text-zinc-400">
                Aucun événement pour ces filtres.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <div className="flex items-center justify-between text-sm">
        {currentPage > 1 ? (
          <Link href={pageHref(currentPage - 1)} className="underline">
            &larr; Page précédente
          </Link>
        ) : (
          <span className="text-zinc-300">&larr; Page précédente</span>
        )}
        <span className="text-zinc-500">
          Page {currentPage} / {totalPages}
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
