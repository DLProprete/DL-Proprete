import Link from "next/link";
import { requireSession } from "@/server/auth/session";
import { listWeekShiftsForAgent } from "@/server/time/queries";
import { shiftState } from "@/server/time/agent-schedule";
import { addDays, formatTimeInParis } from "@/lib/dates";
import { Badge, type BadgeTone } from "@/components/badge";

const DAY_LABEL = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "2-digit", month: "2-digit", timeZone: "UTC" });

const STATE_LABEL: Record<ReturnType<typeof shiftState>, string> = {
  open: "En cours",
  done: "Terminé",
  upcoming: "À venir",
};

const STATE_TONE: Record<ReturnType<typeof shiftState>, BadgeTone> = {
  open: "warning",
  done: "success",
  upcoming: "neutral",
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
          <p className="text-sm text-zinc-600">
            {shifts.length} vacation{shifts.length > 1 ? "s" : ""}
          </p>
        </div>
        <Link href="/today" className="pt-1 text-sm text-brand-700 underline">
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
          <div key={date.toISOString()} className="card">
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
              {DAY_LABEL.format(date)}
            </p>
            {dayShifts.length === 0 ? (
              <p className="mt-1 text-sm text-zinc-500">Aucune vacation</p>
            ) : (
              <ul className="mt-2 space-y-2">
                {dayShifts.map((shift) => (
                  <li key={shift.id} className="flex items-center justify-between text-sm">
                    <span>
                      {formatTimeInParis(shift.startAt)}–{formatTimeInParis(shift.endAt)} ·{" "}
                      {shift.site.name}
                    </span>
                    <Badge tone={STATE_TONE[shiftState(shift)]} label={STATE_LABEL[shiftState(shift)]} />
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
