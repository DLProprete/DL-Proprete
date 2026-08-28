import Link from "next/link";
import { requireSession } from "@/server/auth/session";
import { listShiftsForWeek, listAgents } from "@/server/planning/queries";
import {
  addDays,
  dateOnlyUTC,
  formatDateOnly,
  formatTimeInParis,
  parisToday,
  parseDateOnly,
  startOfWeekMonday,
} from "@/lib/dates";
import { SHIFT_STATUS_LABELS } from "./shift-labels";
import { assignAgentAction, cancelAssignmentAction, generateShiftsAction } from "./actions";

type Shift = Awaited<ReturnType<typeof listShiftsForWeek>>[number];

function formatDay(date: Date) {
  return new Intl.DateTimeFormat("fr-FR", { weekday: "short", day: "2-digit", month: "2-digit" }).format(
    date,
  );
}

export default async function PlanningWeekPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string; error?: string }>;
}) {
  const { week, error } = await searchParams;
  const user = await requireSession();

  const today = parisToday();
  const requestedDay = week ? parseDateOnly(week) : dateOnlyUTC(today.year, today.month, today.day);
  const weekStart = startOfWeekMonday(requestedDay);
  const prevWeek = addDays(weekStart, -7);
  const nextWeek = addDays(weekStart, 7);
  const returnTo = `/planning?week=${formatDateOnly(weekStart)}`;

  const [shifts, agents] = await Promise.all([listShiftsForWeek(user, weekStart), listAgents(user)]);

  const shiftsByAgent = new Map<string, Shift[]>();
  for (const agent of agents) shiftsByAgent.set(agent.id, []);
  const unstaffed: Shift[] = [];

  for (const shift of shifts) {
    if (shift.assignments.length < shift.requiredAgents) {
      unstaffed.push(shift);
    }
    for (const assignment of shift.assignments) {
      const list = shiftsByAgent.get(assignment.user.id) ?? [];
      list.push(shift);
      shiftsByAgent.set(assignment.user.id, list);
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Planning — semaine par agent</h1>
        <div className="flex items-center gap-4 text-sm">
          <Link href="/planning/day" className="underline">
            Vue jour par site
          </Link>
          <form action={generateShiftsAction.bind(null, returnTo)}>
            <button
              type="submit"
              className="rounded bg-zinc-900 px-3 py-2 text-white hover:bg-zinc-800"
            >
              Générer le planning (8 semaines)
            </button>
          </form>
        </div>
      </div>

      {error === "conflict" && (
        <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          Affectation refusée : conflit d&apos;horaire avec une autre vacation, ou agent invalide.
        </p>
      )}

      <div className="flex items-center justify-between text-sm">
        <Link href={`/planning?week=${formatDateOnly(prevWeek)}`} className="underline">
          &larr; Semaine précédente
        </Link>
        <span className="font-medium">
          Semaine du {formatDay(weekStart)} au {formatDay(addDays(weekStart, 6))}
        </span>
        <Link href={`/planning?week=${formatDateOnly(nextWeek)}`} className="underline">
          Semaine suivante &rarr;
        </Link>
      </div>

      <div className="space-y-6">
        {agents.map((agent) => {
          const agentShifts = shiftsByAgent.get(agent.id) ?? [];
          return (
            <div key={agent.id}>
              <h2 className="text-sm font-medium text-zinc-700">
                {agent.firstName} {agent.lastName}
              </h2>
              <ul className="mt-1 divide-y divide-zinc-100 text-sm">
                {agentShifts.map((shift) => (
                  <li key={shift.id} className="py-1 text-zinc-600">
                    {formatDay(shift.date)} · {shift.site.name} · {formatTimeInParis(shift.startAt)}–
                    {formatTimeInParis(shift.endAt)}
                  </li>
                ))}
                {agentShifts.length === 0 && (
                  <li className="py-1 text-zinc-400">Aucune vacation cette semaine.</li>
                )}
              </ul>
            </div>
          );
        })}
        {agents.length === 0 && <p className="text-sm text-zinc-400">Aucun agent actif.</p>}
      </div>

      <div>
        <h2 className="text-sm font-medium text-zinc-700">Vacations non pourvues ou incomplètes</h2>
        <ul className="mt-2 divide-y divide-zinc-100 text-sm">
          {unstaffed.map((shift) => (
            <li key={shift.id} className="flex items-center justify-between gap-4 py-3">
              <div>
                <p>
                  {formatDay(shift.date)} · {shift.site.name} · {formatTimeInParis(shift.startAt)}–
                  {formatTimeInParis(shift.endAt)}
                </p>
                <p className="text-xs text-zinc-500">
                  {SHIFT_STATUS_LABELS[shift.status]} — {shift.assignments.length}/{shift.requiredAgents}{" "}
                  agent(s)
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
            </li>
          ))}
          {unstaffed.length === 0 && (
            <li className="py-2 text-zinc-400">Toutes les vacations de la semaine sont pourvues.</li>
          )}
        </ul>
      </div>
    </div>
  );
}
