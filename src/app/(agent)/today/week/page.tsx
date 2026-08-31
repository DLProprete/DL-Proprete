import Link from "next/link";
import { requireSession } from "@/server/auth/session";
import { listWeekShiftsForAgent } from "@/server/time/queries";
import { shiftState } from "@/server/time/agent-schedule";
import { addDays, formatTimeInParis } from "@/lib/dates";

const DAY_LABEL = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "2-digit", month: "2-digit", timeZone: "UTC" });

const STATE_LABEL: Record<ReturnType<typeof shiftState>, string> = {
  open: "En cours",
  done: "Terminé",
  upcoming: "À venir",
};

export default async function WeekPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  const { week } = await searchParams;
  const weekOffset = week ? Number(week) : 0;
  const user = await requireSession();
  const { monday, shifts } = await listWeekShiftsForAgent(user, weekOffset);

  const days = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(monday, i);
    return { date, shifts: shifts.filter((s) => s.date.getTime() === date.getTime()) };
  });

  return (
    <div className="mx-auto w-full max-w-md space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-lg font-semibold text-zinc-900">Cette semaine</h1>
          <p className="text-sm text-zinc-500">
            {shifts.length} vacation{shifts.length > 1 ? "s" : ""}
          </p>
        </div>
        <Link href="/today" className="pt-1 text-sm text-teal-700 underline">
          Aujourd&apos;hui
        </Link>
      </div>

      <div className="flex items-center justify-between text-sm">
        <Link href={`/today/week?week=${weekOffset - 1}`} className="underline">
          &larr; Semaine précédente
        </Link>
        <Link href={`/today/week?week=${weekOffset + 1}`} className="underline">
          Semaine suivante &rarr;
        </Link>
      </div>

      <div className="space-y-3">
        {days.map(({ date, shifts: dayShifts }) => (
          <div key={date.toISOString()} className="rounded-xl border border-zinc-200 bg-white p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">
              {DAY_LABEL.format(date)}
            </p>
            {dayShifts.length === 0 ? (
              <p className="mt-1 text-sm text-zinc-400">Aucune vacation</p>
            ) : (
              <ul className="mt-2 space-y-2">
                {dayShifts.map((shift) => (
                  <li key={shift.id} className="flex items-center justify-between text-sm">
                    <span>
                      {formatTimeInParis(shift.startAt)}–{formatTimeInParis(shift.endAt)} ·{" "}
                      {shift.site.name}
                    </span>
                    <span className="text-xs text-zinc-500">{STATE_LABEL[shiftState(shift)]}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
