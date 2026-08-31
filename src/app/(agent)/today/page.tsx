import { requireSession } from "@/server/auth/session";
import { listTodayShiftsForAgent, getAgentGreetingName } from "@/server/time/queries";
import { shiftState, scheduleWarning } from "@/server/time/agent-schedule";
import { formatTimeInParis } from "@/lib/dates";
import { startTimeEntryAction, endTimeEntryAction } from "../actions";
import { LiveTimer } from "@/components/live-timer";

const START_BUTTON_CLASS =
  "min-h-16 w-full rounded-xl bg-teal-700 text-lg font-semibold text-white hover:bg-teal-800 active:bg-teal-900";
// amber-600 sur blanc ne fait que ~3,2:1 (insuffisant en texte normal,
// WCAG AA exige 4,5:1) — amber-700 passe à ~5:1.
const END_BUTTON_CLASS =
  "min-h-16 w-full rounded-xl bg-amber-700 text-lg font-semibold text-white hover:bg-amber-800 active:bg-amber-900";

function ShortAddress({ address, city }: { address: string; city: string }) {
  return (
    <p className="text-sm text-zinc-500">
      {address}, {city}
    </p>
  );
}

function Consignes({
  instructions,
  accessNotes,
}: {
  instructions?: string | null;
  accessNotes?: string | null;
}) {
  if (!instructions && !accessNotes) return null;
  return (
    <div className="mt-4 space-y-1 border-t border-zinc-100 pt-4 text-sm text-zinc-700">
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">Consignes</p>
      {instructions && <p>{instructions}</p>}
      {accessNotes && <p>{accessNotes}</p>}
    </div>
  );
}

export default async function TodayPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; justEnded?: string }>;
}) {
  const { error, justEnded } = await searchParams;
  const user = await requireSession();

  const [shifts, greetingName] = await Promise.all([
    listTodayShiftsForAgent(user),
    getAgentGreetingName(user),
  ]);

  const now = new Date();
  const openShift = shifts.find((s) => shiftState(s) === "open") ?? null;
  const activeShift = openShift ?? shifts.find((s) => shiftState(s) === "upcoming") ?? null;
  const activeIndex = activeShift ? shifts.indexOf(activeShift) : -1;
  const upcomingAfterActive =
    activeIndex >= 0 ? shifts.slice(activeIndex + 1).filter((s) => shiftState(s) === "upcoming") : [];
  const openEntry = openShift?.timeEntries.find((entry) => entry.status === "OPEN") ?? null;
  const justEndedShift = justEnded
    ? (shifts.find((s) => s.id === justEnded && shiftState(s) === "done") ?? null)
    : null;

  const warning = activeShift
    ? scheduleWarning(openEntry ? openEntry.clockInAt : now, activeShift.startAt, activeShift)
    : null;

  return (
    <div className="mx-auto w-full max-w-md space-y-4">
      <div>
        <h1 className="text-lg font-semibold text-zinc-900">Bonjour, {greetingName}</h1>
        <p className="text-sm text-zinc-500">
          {shifts.length} vacation{shifts.length > 1 ? "s" : ""} aujourd&apos;hui
        </p>
      </div>

      {error === "already-open" && (
        <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          Un pointage est déjà en cours. Terminez-le avant d&apos;en démarrer un autre.
        </p>
      )}

      {warning && (
        <p className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          {warning}
        </p>
      )}

      {justEndedShift && (
        <div className="rounded-xl border border-zinc-200 bg-white p-4 text-sm">
          <p className="font-medium text-zinc-900">Terminé — en attente de validation</p>
          <p className="text-zinc-500">
            {justEndedShift.site.name} · {formatTimeInParis(justEndedShift.startAt)}–
            {formatTimeInParis(justEndedShift.endAt)}
          </p>
        </div>
      )}

      {activeShift ? (
        <>
          <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
            {openEntry ? (
              <>
                <p className="text-sm font-medium text-zinc-500">Pointage en cours</p>
                <p className="mt-1 text-xl font-semibold text-zinc-900">{activeShift.site.name}</p>
                <ShortAddress address={activeShift.site.address} city={activeShift.site.city} />
                <p className="mt-2 text-sm text-zinc-500">
                  Débuté à {formatTimeInParis(openEntry.clockInAt)}
                </p>
                <p className="mt-3 text-4xl font-bold tabular-nums tracking-tight text-zinc-900">
                  <LiveTimer since={openEntry.clockInAt.toISOString()} />
                </p>
              </>
            ) : (
              <>
                <p className="text-xl font-semibold text-zinc-900">{activeShift.site.name}</p>
                <ShortAddress address={activeShift.site.address} city={activeShift.site.city} />
                <p className="mt-3 text-4xl font-bold tracking-tight text-zinc-900">
                  {formatTimeInParis(activeShift.startAt)}–{formatTimeInParis(activeShift.endAt)}
                </p>
              </>
            )}
            <Consignes
              instructions={activeShift.serviceTemplate?.instructions}
              accessNotes={activeShift.site.accessNotes}
            />
          </div>

          {openEntry ? (
            <form action={endTimeEntryAction.bind(null, openEntry.id)}>
              <button type="submit" className={END_BUTTON_CLASS}>
                Terminer
              </button>
            </form>
          ) : (
            <form action={startTimeEntryAction.bind(null, activeShift.id)}>
              <button type="submit" className={START_BUTTON_CLASS}>
                Démarrer
              </button>
            </form>
          )}

          {upcomingAfterActive.length > 0 && (
            <div className="space-y-2">
              {upcomingAfterActive.map((shift) => (
                <div
                  key={shift.id}
                  className="rounded-lg border border-zinc-200 bg-zinc-100 p-3 text-sm text-zinc-500"
                >
                  {formatTimeInParis(shift.startAt)}–{formatTimeInParis(shift.endAt)} · {shift.site.name}
                </div>
              ))}
            </div>
          )}
        </>
      ) : shifts.length > 0 ? (
        <div className="rounded-xl border border-zinc-200 bg-white p-5 text-center text-sm text-zinc-500 shadow-sm">
          Journée terminée.
        </div>
      ) : (
        <div className="rounded-xl border border-zinc-200 bg-white p-5 text-center text-sm text-zinc-500 shadow-sm">
          Aucune vacation prévue aujourd&apos;hui.
        </div>
      )}
    </div>
  );
}
