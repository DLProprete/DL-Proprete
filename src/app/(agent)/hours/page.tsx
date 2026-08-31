import Link from "next/link";
import { requireSession } from "@/server/auth/session";
import { getAgentMonthlyHours } from "@/server/time/queries";
import { formatTimeInParis, parisToday } from "@/lib/dates";

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "2-digit" }).format(date);
}

function monthLabel(year: number, month: number) {
  return new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric", timeZone: "UTC" }).format(
    new Date(Date.UTC(year, month - 1, 1)),
  );
}

export default async function HoursPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; month?: string }>;
}) {
  const { year: yearParam, month: monthParam } = await searchParams;
  const today = parisToday();
  const year = yearParam ? Number(yearParam) : today.year;
  const month = monthParam ? Number(monthParam) : today.month;

  const user = await requireSession();
  const { totalHours, entries, pendingCount } = await getAgentMonthlyHours(user, year, month);

  const prev = month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 };
  const next = month === 12 ? { year: year + 1, month: 1 } : { year, month: month + 1 };

  return (
    <div className="mx-auto w-full max-w-md space-y-4">
      <h1 className="text-lg font-semibold text-zinc-900">Mes heures</h1>

      <div className="flex items-center justify-between text-sm">
        <Link href={`/hours?year=${prev.year}&month=${prev.month}`} className="underline">
          &larr; Mois précédent
        </Link>
        <span className="capitalize text-zinc-600">{monthLabel(year, month)}</span>
        <Link href={`/hours?year=${next.year}&month=${next.month}`} className="underline">
          Mois suivant &rarr;
        </Link>
      </div>

      <div className="card text-center">
        <p className="text-sm font-medium text-zinc-600">Heures validées</p>
        <p className="mt-1 text-4xl font-bold tabular-nums tracking-tight text-zinc-900">
          {totalHours.toFixed(2)} h
        </p>
        {pendingCount > 0 && (
          <p className="mt-2 text-sm text-amber-700">
            {pendingCount} pointage{pendingCount > 1 ? "s" : ""} en attente de validation — pas encore
            compté{pendingCount > 1 ? "s" : ""} ci-dessus.
          </p>
        )}
      </div>

      <div className="space-y-2">
        {entries.map((entry) => (
          <div
            key={entry.id}
            className="flex items-center justify-between rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm"
          >
            <span>
              {formatDate(entry.clockInAt)} · {entry.site.name}
            </span>
            <span className="text-zinc-600">
              {formatTimeInParis(entry.clockInAt)}–{entry.clockOutAt ? formatTimeInParis(entry.clockOutAt) : "?"}
            </span>
          </div>
        ))}
        {entries.length === 0 && (
          <p className="rounded-lg border border-zinc-200 bg-white px-3 py-4 text-center text-sm text-zinc-500">
            Aucun pointage validé pour ce mois.
          </p>
        )}
      </div>
    </div>
  );
}
