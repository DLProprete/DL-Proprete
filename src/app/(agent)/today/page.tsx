import { requireSession } from "@/server/auth/session";
import { listTodayShiftsForAgent, getOpenTimeEntry } from "@/server/time/queries";
import { formatTimeInParis } from "@/lib/dates";
import { startTimeEntryAction, endTimeEntryAction } from "../actions";

export default async function TodayPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const user = await requireSession();

  const [shifts, openEntry] = await Promise.all([
    listTodayShiftsForAgent(user),
    getOpenTimeEntry(user),
  ]);

  return (
    <div className="max-w-lg space-y-6">
      <h1 className="text-xl font-semibold">Aujourd&apos;hui</h1>

      {error === "already-open" && (
        <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          Un pointage est déjà en cours. Terminez-le avant d&apos;en démarrer un autre.
        </p>
      )}

      {openEntry ? (
        <div className="rounded border border-zinc-200 p-4">
          <p className="text-sm text-zinc-600">Pointage en cours</p>
          <p className="mt-1 font-medium">{openEntry.site.name}</p>
          <p className="text-sm text-zinc-500">
            Débuté à {formatTimeInParis(openEntry.clockInAt)}
          </p>
          <form action={endTimeEntryAction.bind(null, openEntry.id)} className="mt-3">
            <button
              type="submit"
              className="rounded bg-zinc-900 px-4 py-2 text-sm text-white hover:bg-zinc-800"
            >
              Terminer
            </button>
          </form>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-zinc-600">Vos vacations du jour</p>
          <ul className="divide-y divide-zinc-100">
            {shifts.map((shift) => (
              <li key={shift.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="font-medium">{shift.site.name}</p>
                  <p className="text-sm text-zinc-500">
                    {formatTimeInParis(shift.startAt)}–{formatTimeInParis(shift.endAt)}
                  </p>
                </div>
                <form action={startTimeEntryAction.bind(null, shift.id)}>
                  <button
                    type="submit"
                    className="rounded bg-zinc-900 px-4 py-2 text-sm text-white hover:bg-zinc-800"
                  >
                    Démarrer
                  </button>
                </form>
              </li>
            ))}
            {shifts.length === 0 && (
              <li className="py-3 text-sm text-zinc-400">Aucune vacation prévue aujourd&apos;hui.</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
