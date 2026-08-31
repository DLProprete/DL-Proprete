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
import { SHIFT_STATUS_LABELS, SHIFT_STATUS_TONE, SHIFT_STATUS_EDGE } from "./shift-labels";
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
  const todayKey = formatDateOnly(dateOnlyUTC(today.year, today.month, today.day));
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
  const holidayKeys = new Set(holidays.map((holiday) => formatDateOnly(holiday.date)));

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
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">Planning — semaine par agent</h1>
        <div className="flex items-center gap-3 text-sm">
          <Link href="/planning/day" className="underline">
            Vue jour par site
          </Link>
          {/* Action de maintenance, pas l'action principale de l'écran :
              affecter un agent l'est. Bouton secondaire, donc. */}
          <form action={generateShiftsAction.bind(null, returnTo)}>
            <button type="submit" className="btn btn-secondary btn-sm">
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
        <p className="alert alert-danger">Affectation refusée — {error}</p>
      )}

      {/* Les vacations à repourvoir passent avant la grille : c'est ce qu'on
          vient faire ici le matin. La grille sert à vérifier, pas à agir. */}
      <section className="rounded-lg border border-zinc-200 bg-white">
        <h2 className="flex items-baseline gap-2 border-b border-zinc-200 px-4 py-2.5 text-sm font-semibold text-zinc-800">
          Vacations non pourvues ou incomplètes
          {unstaffed.length > 0 && (
            <span className="num text-xs font-normal text-zinc-500">{unstaffed.length}</span>
          )}
        </h2>
        {unstaffed.length === 0 ? (
          <p className="px-4 py-3 text-sm text-zinc-500">
            Toutes les vacations de la semaine sont pourvues.
          </p>
        ) : (
          <ul className="divide-y divide-zinc-100">
            {unstaffed.map((shift) => (
              <li
                key={shift.id}
                className="flex flex-col gap-3 border-l-2 border-l-amber-500 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="text-sm">
                  <p className="font-medium text-zinc-900">
                    {shift.site.name}{" "}
                    <span className="num font-normal text-zinc-600">
                      {formatDay(shift.date)} · {formatTimeInParis(shift.startAt)}–
                      {formatTimeInParis(shift.endAt)}
                    </span>
                  </p>
                  <p className="mt-1 flex flex-wrap items-center gap-2">
                    <Badge
                      tone={SHIFT_STATUS_TONE[shift.status] ?? "neutral"}
                      label={`${shift.assignments.length}/${shift.requiredAgents} agent${
                        shift.requiredAgents > 1 ? "s" : ""
                      }`}
                    />
                    {shift.assignments.map((assignment) => (
                      <form
                        key={assignment.id}
                        action={cancelAssignmentAction.bind(null, assignment.id, returnTo)}
                        className="inline-flex items-center gap-1.5 text-xs text-zinc-600"
                      >
                        <span>
                          {assignment.user.firstName} {assignment.user.lastName}
                        </span>
                        <button type="submit" className="text-red-700 underline">
                          retirer
                        </button>
                      </form>
                    ))}
                  </p>
                </div>
                <form
                  action={assignAgentAction.bind(null, shift.id, returnTo)}
                  className="flex shrink-0 items-center gap-2"
                >
                  <select
                    name="agentUserId"
                    required
                    defaultValue=""
                    aria-label={`Affecter un agent — ${shift.site.name}`}
                    className="field field-sm min-h-9"
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
                  <button type="submit" className="btn btn-primary btn-sm">
                    Affecter
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>

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

      <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white">
        <table className="w-full min-w-[820px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-zinc-200">
              {/* Colonne des agents figée : à 16 agents sur 7 jours, on perd
                  la ligne qu'on lit dès qu'on fait défiler horizontalement. */}
              <th className="sticky left-0 z-10 w-44 bg-white px-3 py-2 font-medium text-zinc-600">
                Agent
              </th>
              {weekDays.map((day) => {
                const dayKey = formatDateOnly(day);
                const isToday = dayKey === todayKey;
                const isHoliday = holidayKeys.has(dayKey);
                const isWeekend = day.getUTCDay() === 0 || day.getUTCDay() === 6;
                return (
                  <th
                    key={dayKey}
                    scope="col"
                    className={`px-2 py-2 font-medium capitalize ${
                      isToday ? "bg-brand-50 text-brand-900" : "text-zinc-600"
                    } ${isWeekend || isHoliday ? "bg-zinc-50" : ""}`}
                  >
                    {formatDay(day)}
                    {isHoliday && (
                      <span className="ml-1 text-xs font-normal text-zinc-500">férié</span>
                    )}
                  </th>
                );
              })}
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
                  <th
                    scope="row"
                    className="sticky left-0 z-10 bg-white px-3 py-2 text-left font-medium text-zinc-800"
                  >
                    {agent.firstName} {agent.lastName}
                    {ccnAlerts.length > 0 && (
                      <ul className="mt-1 space-y-0.5 text-xs font-normal text-amber-700">
                        {ccnAlerts.map((alert, index) => (
                          <li key={index}>⚠ {describeCcnAlert(alert)}</li>
                        ))}
                      </ul>
                    )}
                  </th>
                  {weekDays.map((day) => {
                    const dayKey = formatDateOnly(day);
                    const dayShifts = byDay.get(dayKey) ?? [];
                    const isToday = dayKey === todayKey;
                    const isWeekend = day.getUTCDay() === 0 || day.getUTCDay() === 6;
                    return (
                      <td
                        key={dayKey}
                        className={`px-2 py-2 align-top ${isToday ? "bg-brand-50/60" : ""} ${
                          isWeekend || holidayKeys.has(dayKey) ? "bg-zinc-50" : ""
                        }`}
                      >
                        {/* Cellule vide laissée vide : les pavés gris « — »
                            occupaient l'œil sur la majorité de la grille. */}
                        <div className="space-y-1.5">
                          {dayShifts.map((shift) => (
                            <div
                              key={shift.id}
                              className={`rounded border border-zinc-200 border-l-2 bg-white px-2 py-1.5 ${
                                SHIFT_STATUS_EDGE[shift.status] ?? "border-l-zinc-300"
                              }`}
                            >
                              <p className="text-xs font-medium text-zinc-800">{shift.site.name}</p>
                              <p className="num text-xs text-zinc-600">
                                {formatTimeInParis(shift.startAt)}–{formatTimeInParis(shift.endAt)}
                              </p>
                              {shift.assignments.length < shift.requiredAgents && (
                                <p className="mt-1">
                                  <Badge
                                    tone={SHIFT_STATUS_TONE[shift.status] ?? "neutral"}
                                    label={SHIFT_STATUS_LABELS[shift.status]}
                                  />
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
            {agents.length === 0 && (
              <tr>
                <td colSpan={8} className="px-3 py-4 text-zinc-500">
                  Aucun agent actif.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {user.role === "ADMIN" && (
        /* Réglage annuel, consulté deux fois par an : replié pour ne pas
           occuper le haut de l'écran tous les matins. */
        <details className="rounded-lg border border-zinc-200 bg-white text-sm">
          <summary className="cursor-pointer px-4 py-2.5 font-medium text-zinc-800">
            Jours fériés {today.year}
            <span className="num ml-2 font-normal text-zinc-500">{holidays.length}</span>
          </summary>
          <div className="border-t border-zinc-200 px-4 py-3">
            <form action={importHolidaysAction.bind(null, returnTo)} className="flex items-end gap-2">
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
              <button type="submit" className="btn btn-secondary btn-sm">
                Importer
              </button>
            </form>
            <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-600">
              {holidays.map((holiday) => (
                <li key={holiday.id}>
                  {formatDay(holiday.date)} — {holiday.name}
                </li>
              ))}
              {holidays.length === 0 && <li>Aucun jour férié importé pour {today.year}.</li>}
            </ul>
          </div>
        </details>
      )}
    </div>
  );
}
