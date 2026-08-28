import Link from "next/link";
import { requireSession } from "@/server/auth/session";
import { listShiftsForDay, listAgents } from "@/server/planning/queries";
import { addDays, dateOnlyUTC, formatDateOnly, formatTime, parisToday, parseDateOnly } from "@/lib/dates";
import { SHIFT_STATUS_LABELS } from "../shift-labels";
import { assignAgentAction, cancelAssignmentAction } from "../actions";

type Shift = Awaited<ReturnType<typeof listShiftsForDay>>[number];

function formatDay(date: Date) {
  return new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "2-digit", month: "2-digit" }).format(
    date,
  );
}

export default async function PlanningDayPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; error?: string }>;
}) {
  const { date, error } = await searchParams;
  const user = await requireSession();

  const today = parisToday();
  const day = date ? parseDateOnly(date) : dateOnlyUTC(today.year, today.month, today.day);
  const prevDay = addDays(day, -1);
  const nextDay = addDays(day, 1);
  const returnTo = `/planning/day?date=${formatDateOnly(day)}`;

  const [shifts, agents] = await Promise.all([listShiftsForDay(user, day), listAgents(user)]);

  const shiftsBySite = new Map<string, { name: string; shifts: Shift[] }>();
  for (const shift of shifts) {
    const entry = shiftsBySite.get(shift.site.id) ?? { name: shift.site.name, shifts: [] };
    entry.shifts.push(shift);
    shiftsBySite.set(shift.site.id, entry);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Planning — jour par site</h1>
        <Link href="/planning" className="text-sm underline">
          Vue semaine par agent
        </Link>
      </div>

      {error === "conflict" && (
        <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          Affectation refusée : conflit d&apos;horaire avec une autre vacation, ou agent invalide.
        </p>
      )}

      <div className="flex items-center justify-between text-sm">
        <Link href={`/planning/day?date=${formatDateOnly(prevDay)}`} className="underline">
          &larr; Jour précédent
        </Link>
        <span className="font-medium capitalize">{formatDay(day)}</span>
        <Link href={`/planning/day?date=${formatDateOnly(nextDay)}`} className="underline">
          Jour suivant &rarr;
        </Link>
      </div>

      <div className="space-y-6">
        {[...shiftsBySite.values()].map((site) => (
          <div key={site.name}>
            <h2 className="text-sm font-medium text-zinc-700">{site.name}</h2>
            <ul className="mt-1 divide-y divide-zinc-100 text-sm">
              {site.shifts.map((shift) => (
                <li key={shift.id} className="flex items-center justify-between gap-4 py-2">
                  <div>
                    <p>
                      {formatTime(shift.startAt)}–{formatTime(shift.endAt)} —{" "}
                      {SHIFT_STATUS_LABELS[shift.status]} ({shift.assignments.length}/
                      {shift.requiredAgents} agent(s))
                    </p>
                    {shift.assignments.map((assignment) => (
                      <form
                        key={assignment.id}
                        action={cancelAssignmentAction.bind(null, assignment.id, returnTo)}
                        className="mt-1 inline-flex items-center gap-2"
                      >
                        <span className="text-xs text-zinc-600">
                          {assignment.user.firstName} {assignment.user.lastName}
                        </span>
                        <button type="submit" className="text-xs text-red-600 underline">
                          retirer
                        </button>
                      </form>
                    ))}
                  </div>
                  {shift.assignments.length < shift.requiredAgents && (
                    <form
                      action={assignAgentAction.bind(null, shift.id, returnTo)}
                      className="flex items-center gap-2"
                    >
                      <select
                        name="agentUserId"
                        required
                        defaultValue=""
                        className="rounded border border-zinc-300 px-2 py-1 text-sm"
                      >
                        <option value="" disabled>
                          Affecter…
                        </option>
                        {agents.map((agent) => (
                          <option key={agent.id} value={agent.id}>
                            {agent.firstName} {agent.lastName}
                          </option>
                        ))}
                      </select>
                      <button
                        type="submit"
                        className="rounded border border-zinc-300 px-2 py-1 text-xs hover:bg-zinc-50"
                      >
                        OK
                      </button>
                    </form>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
        {shiftsBySite.size === 0 && (
          <p className="text-sm text-zinc-400">Aucune vacation ce jour-là.</p>
        )}
      </div>
    </div>
  );
}
