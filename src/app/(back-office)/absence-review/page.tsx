import Link from "next/link";
import { redirect } from "next/navigation";
import { requireSession } from "@/server/auth/session";
import { listPendingAbsences, listShiftsNeedingReplacement } from "@/server/absences/queries";
import { listReplacementCandidates } from "@/server/absences/replacements";
import { formatTimeInParis } from "@/lib/dates";
import { approveAbsenceAction, rejectAbsenceAction } from "./actions";
import { assignAgentAction } from "../planning/actions";

const TYPE_LABELS: Record<string, string> = {
  PAID_LEAVE: "Congé payé",
  RTT: "RTT",
  SICK: "Arrêt maladie",
  OTHER: "Autre",
};

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("fr-FR").format(date);
}

export default async function AbsencesReviewPage() {
  const user = await requireSession();
  if (user.role !== "ADMIN") {
    redirect("/clients");
  }

  const [pending, shiftsNeedingReplacement] = await Promise.all([
    listPendingAbsences(user),
    listShiftsNeedingReplacement(user),
  ]);

  const shiftsWithCandidates = await Promise.all(
    shiftsNeedingReplacement.map(async (shift) => ({
      shift,
      candidates: await listReplacementCandidates(user, shift.id),
    })),
  );

  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <h1 className="text-xl font-semibold">Absences en attente</h1>
        <ul className="mt-2 divide-y divide-zinc-100 text-sm">
          {pending.map((absence) => (
            <li key={absence.id} className="flex items-center justify-between gap-4 py-3">
              <div>
                <p className="font-medium">
                  {absence.user.firstName} {absence.user.lastName} —{" "}
                  {TYPE_LABELS[absence.type] ?? absence.type}
                </p>
                <p className="text-zinc-600">
                  {formatDate(absence.startsOn)} – {formatDate(absence.endsOn)}
                </p>
                {absence.documentPath && (
                  <a
                    href={`/api/absences/${absence.id}/document`}
                    className="text-xs underline"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Voir le justificatif
                  </a>
                )}
              </div>
              <div className="flex gap-2">
                <form action={approveAbsenceAction.bind(null, absence.id)}>
                  <button type="submit" className="text-xs text-green-700 underline">
                    Approuver
                  </button>
                </form>
                <form action={rejectAbsenceAction.bind(null, absence.id)}>
                  <button type="submit" className="text-xs text-red-600 underline">
                    Rejeter
                  </button>
                </form>
              </div>
            </li>
          ))}
          {pending.length === 0 && (
            <li className="py-3 text-zinc-500">
              Aucune absence en attente. <Link href="/planning" className="underline">Ouvrir le planning</Link>
            </li>
          )}
        </ul>
      </div>

      <div>
        <h2 className="text-sm font-medium text-zinc-700">Vacations à repourvoir</h2>
        <ul className="mt-2 divide-y divide-zinc-100 text-sm">
          {shiftsWithCandidates.map(({ shift, candidates }) => {
            const returnTo = "/absence-review";
            return (
              <li key={shift.id} className="flex items-center justify-between gap-4 py-3">
                <div>
                  <p>
                    {formatDate(shift.date)} · {shift.site.name} · {formatTimeInParis(shift.startAt)}–
                    {formatTimeInParis(shift.endAt)}
                  </p>
                  <p className="text-xs text-zinc-600">
                    Remplace{" "}
                    {shift.assignments
                      .map((a) => `${a.user.firstName} ${a.user.lastName}`)
                      .join(", ")}
                  </p>
                </div>
                <form
                  action={assignAgentAction.bind(null, shift.id, returnTo)}
                  className="flex items-center gap-2"
                >
                  <select
                    name="agentUserId"
                    required
                    defaultValue=""
                    className="field field-sm"
                  >
                    <option value="" disabled>
                      {candidates.length === 0 ? "Aucun candidat sans conflit" : "Affecter…"}
                    </option>
                    {candidates.map((agent) => (
                      <option key={agent.id} value={agent.id}>
                        {agent.firstName} {agent.lastName}
                      </option>
                    ))}
                  </select>
                  <button
                    type="submit"
                    disabled={candidates.length === 0}
                    className="btn btn-secondary btn-xs disabled:opacity-40"
                  >
                    OK
                  </button>
                </form>
              </li>
            );
          })}
          {shiftsWithCandidates.length === 0 && (
            <li className="py-3 text-zinc-500">Rien à repourvoir.</li>
          )}
        </ul>
      </div>
    </div>
  );
}
