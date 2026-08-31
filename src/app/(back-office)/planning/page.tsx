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
import { listHolidays } from "@/server/holidays/queries";
import { weeklyCcnAlerts, describeCcnAlert } from "@/server/planning/ccn-alerts";
import { SHIFT_STATUS_LABELS, SHIFT_STATUS_TONE } from "./shift-labels";
import {
  assignAgentAction,
  cancelAssignmentAction,
  generateShiftsAction,
  importHolidaysAction,
} from "./actions";
import { Badge } from "@/components/badge";

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

  const [shifts, agents, holidays] = await Promise.all([
    listShiftsForWeek(user, weekStart),
    listAgents(user),
    user.role === "ADMIN" ? listHolidays(user, today.year) : Promise.resolve([]),
  ]);

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const shiftsByAgentAndDay = new Map<string, Map<string, Shift[]>>();
  for (const agent of agents) shiftsByAgentAndDay.set(agent.id, new Map());
  const unstaffed: Shift[] = [];

  for (const shift of shifts) {
    if (shift.assignments.length < shift.requiredAgents) {
      unstaffed.push(shift);
    }
    const dayKey = formatDateOnly(shift.date);
    for (const assignment of shift.assignments) {
      const byDay = shiftsByAgentAndDay.get(assignment.user.id) ?? new Map<string, Shift[]>();
      const dayShifts = byDay.get(dayKey) ?? [];
      dayShifts.push(shift);
      byDay.set(dayKey, dayShifts);
      shiftsByAgentAndDay.set(assignment.user.id, byDay);
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
              className="btn btn-primary"
            >
              Générer le planning (8 semaines)
            </button>
          </form>
        </div>
      </div>

      {error === "conflict" && (
        <p className="alert alert-danger">
          Affectation refusée : conflit d&apos;horaire avec une autre vacation, ou agent invalide.
        </p>
      )}
      {error && error !== "conflict" && (
        <p className="alert alert-danger">
          Affectation refusée — {error}
        </p>
      )}

      {user.role === "ADMIN" && (
        <div className="rounded border border-zinc-200 p-4 text-sm">
          <h2 className="font-medium text-zinc-700">Jours fériés</h2>
          <form action={importHolidaysAction.bind(null, returnTo)} className="mt-2 flex items-end gap-2">
            <div>
              <label htmlFor="year" className="block text-xs text-zinc-600">
                Année
              </label>
              <input
                id="year"
                name="year"
                type="number"
                defaultValue={today.year}
                className="mt-1 w-24 field field-sm"
              />
            </div>
            <button
              type="submit"
              className="field text-xs hover:bg-zinc-50"
            >
              Importer jours fériés année
            </button>
          </form>
          <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-600">
            {holidays.map((holiday) => (
              <li key={holiday.id}>
                {formatDay(holiday.date)} — {holiday.name}
              </li>
            ))}
            {holidays.length === 0 && <li>Aucun jour férié importé pour {today.year}.</li>}
          </ul>
        </div>
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

      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-zinc-200 text-zinc-600">
              <th className="w-40 py-2 pr-2 font-medium">Agent</th>
              {weekDays.map((day) => (
                <th key={formatDateOnly(day)} className="py-2 pr-2 font-medium capitalize">
                  {formatDay(day)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {agents.map((agent) => {
              const byDay = shiftsByAgentAndDay.get(agent.id) ?? new Map<string, Shift[]>();
              const weekShifts = [...byDay.values()].flat();
              const ccnAlerts = weeklyCcnAlerts(
                weekShifts,
                agent.weeklyContractHours ? Number(agent.weeklyContractHours) : null,
              );
              return (
                <tr key={agent.id} className="border-b border-zinc-100 align-top">
                  <td className="py-2 pr-2 font-medium text-zinc-700">
                    {agent.firstName} {agent.lastName}
                    {ccnAlerts.length > 0 && (
                      <ul className="mt-1 space-y-0.5 text-xs font-normal text-amber-700">
                        {ccnAlerts.map((alert, index) => (
                          <li key={index}>⚠ {describeCcnAlert(alert)}</li>
                        ))}
                      </ul>
                    )}
                  </td>
                  {weekDays.map((day) => {
                    const dayKey = formatDateOnly(day);
                    const dayShifts = byDay.get(dayKey) ?? [];
                    return (
                      <td key={dayKey} className="py-2 pr-2 align-top">
                        {dayShifts.length === 0 ? (
                          <div className="flex h-10 items-center justify-center rounded bg-zinc-100 text-zinc-500">
                            —
                          </div>
                        ) : (
                        <div className="space-y-1.5">
                          {dayShifts.map((shift) => (
                            <div key={shift.id} className="rounded border border-zinc-200 p-1.5">
                              <p className="text-xs font-medium text-zinc-700">{shift.site.name}</p>
                              <p className="text-xs text-zinc-600">
                                {formatTimeInParis(shift.startAt)}–{formatTimeInParis(shift.endAt)}
                              </p>
                              <Badge
                                tone={SHIFT_STATUS_TONE[shift.status] ?? "neutral"}
                                label={SHIFT_STATUS_LABELS[shift.status]}
                              />
                            </div>
                          ))}
                        </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
            {agents.length === 0 && (
              <tr>
                <td colSpan={8} className="py-4 text-zinc-500">
                  Aucun agent actif.
                </td>
              </tr>
            )}
          </tbody>
        </table>
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
                <p className="mt-1 flex items-center gap-2 text-xs text-zinc-600">
                  <Badge
                    tone={SHIFT_STATUS_TONE[shift.status] ?? "neutral"}
                    label={`${SHIFT_STATUS_LABELS[shift.status]} — ${shift.assignments.length}/${shift.requiredAgents} agent(s)`}
                  />
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
                  className="field field-sm min-h-10"
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
                  className="btn btn-primary btn-sm min-h-10"
                >
                  Affecter
                </button>
              </form>
            </li>
          ))}
          {unstaffed.length === 0 && (
            <li className="py-2 text-zinc-500">Toutes les vacations de la semaine sont pourvues.</li>
          )}
        </ul>
      </div>
    </div>
  );
}
