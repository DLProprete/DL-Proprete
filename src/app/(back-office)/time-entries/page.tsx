import { requireSession } from "@/server/auth/session";
import { listTimeEntriesForReview } from "@/server/time/review";
import { formatTimeInParis } from "@/lib/dates";
import { validateTimeEntryAction, rejectTimeEntryAction } from "./actions";

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" }).format(
    date,
  );
}

export default async function TimeEntriesReviewPage() {
  const user = await requireSession();
  const entries = await listTimeEntriesForReview(user);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Pointages à valider</h1>
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-zinc-200 text-zinc-500">
            <th className="py-2 font-medium">Agent</th>
            <th className="font-medium">Site</th>
            <th className="font-medium">Date</th>
            <th className="font-medium">Début</th>
            <th className="font-medium">Fin</th>
            <th className="font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => (
            <tr key={entry.id} className="border-b border-zinc-100">
              <td className="py-2">
                {entry.user.firstName} {entry.user.lastName}
              </td>
              <td className="text-zinc-600">{entry.site.name}</td>
              <td className="text-zinc-600">{formatDate(entry.clockInAt)}</td>
              <td className="text-zinc-600">{formatTimeInParis(entry.clockInAt)}</td>
              <td className="text-zinc-600">
                {entry.clockOutAt ? formatTimeInParis(entry.clockOutAt) : "—"}
              </td>
              <td>
                <div className="flex gap-2">
                  <form action={validateTimeEntryAction.bind(null, entry.id)}>
                    <button type="submit" className="text-xs text-green-700 underline">
                      Valider
                    </button>
                  </form>
                  <form action={rejectTimeEntryAction.bind(null, entry.id)}>
                    <button type="submit" className="text-xs text-red-600 underline">
                      Rejeter
                    </button>
                  </form>
                </div>
              </td>
            </tr>
          ))}
          {entries.length === 0 && (
            <tr>
              <td colSpan={6} className="py-4 text-zinc-400">
                Aucun pointage à valider.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
