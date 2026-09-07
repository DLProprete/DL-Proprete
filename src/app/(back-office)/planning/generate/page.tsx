import Link from "next/link";
import { requireSession } from "@/server/auth/session";
import { generateDraftAssignments, type DraftCandidate } from "@/server/planning/draft-assignments";
import { addDays, dateOnlyUTC, formatDateOnly, formatTimeInParis, parisToday, parseDateOnly } from "@/lib/dates";
import { confirmDraftAssignmentsAction } from "../actions";

const EXPERIENCE_LABELS: Record<string, string> = {
  JUNIOR: "débutant",
  CONFIRMED: "confirmé",
  SENIOR: "expérimenté",
};

function describeCandidate(candidate: DraftCandidate) {
  const details = [
    candidate.experienceLevel ? EXPERIENCE_LABELS[candidate.experienceLevel] : null,
    candidate.distanceKm != null ? `${Math.round(candidate.distanceKm)} km` : null,
  ].filter(Boolean);
  const name = `${candidate.firstName} ${candidate.lastName}`;
  return details.length > 0 ? `${name} (${details.join(", ")})` : name;
}

function formatDay(date: Date) {
  return new Intl.DateTimeFormat("fr-FR", { weekday: "short", day: "2-digit", month: "2-digit" }).format(date);
}

export default async function PlanningGeneratePage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; confirmed?: string; failed?: string }>;
}) {
  const { from, to, confirmed, failed } = await searchParams;
  const user = await requireSession();

  const today = parisToday();
  const defaultFrom = dateOnlyUTC(today.year, today.month, today.day);
  const defaultTo = addDays(defaultFrom, 14);
  const fromDate = from ? parseDateOnly(from) : defaultFrom;
  const toDate = to ? parseDateOnly(to) : defaultTo;

  const proposals = await generateDraftAssignments(user, fromDate, toDate);
  const totalSlots = proposals.reduce((sum, proposal) => sum + proposal.slots.length, 0);
  const totalProposed = proposals.reduce(
    (sum, proposal) => sum + proposal.slots.filter((slot) => slot.proposed).length,
    0,
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">Génération assistée du planning</h1>
        <Link href="/planning" className="text-sm underline">
          Retour au planning
        </Link>
      </div>

      <p className="text-sm text-zinc-600">
        Propose un agent pour chaque créneau manquant sur la période, en tenant compte des
        contraintes (contrat, horaires, jours non travaillés), de la proximité domicile-site et du
        niveau d&apos;expérience. Rien n&apos;est affecté tant que vous n&apos;avez pas validé.
      </p>

      {confirmed !== undefined && (
        <p className="alert alert-info">
          {confirmed} affectation{confirmed !== "1" ? "s" : ""} créée{confirmed !== "1" ? "s" : ""}
          {failed && failed !== "0"
            ? `, ${failed} refusée${failed !== "1" ? "s" : ""} (conflit ou contrainte détecté entre-temps).`
            : "."}
        </p>
      )}

      <form method="get" className="flex flex-wrap items-end gap-3 rounded-lg border border-zinc-200 bg-white p-4">
        <div>
          <label htmlFor="from" className="block text-xs text-zinc-600">
            Du
          </label>
          <input
            id="from"
            name="from"
            type="date"
            defaultValue={formatDateOnly(fromDate)}
            className="mt-1 field field-sm"
          />
        </div>
        <div>
          <label htmlFor="to" className="block text-xs text-zinc-600">
            Au
          </label>
          <input
            id="to"
            name="to"
            type="date"
            defaultValue={formatDateOnly(toDate)}
            className="mt-1 field field-sm"
          />
        </div>
        <button type="submit" className="btn btn-secondary btn-sm">
          Générer les propositions
        </button>
      </form>

      {proposals.length === 0 ? (
        <p className="rounded-lg border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-500">
          Aucune vacation non pourvue sur cette période.
        </p>
      ) : (
        <form action={confirmDraftAssignmentsAction} className="space-y-3">
          <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white">
            <table className="w-full min-w-[720px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-200 text-zinc-600">
                  <th className="px-3 py-2 font-medium">Site</th>
                  <th className="px-3 py-2 font-medium">Date</th>
                  <th className="px-3 py-2 font-medium">Horaire</th>
                  <th className="px-3 py-2 font-medium">Agent proposé</th>
                </tr>
              </thead>
              <tbody>
                {proposals.map((proposal) =>
                  proposal.slots.map((slot, slotIndex) => (
                    <tr key={`${proposal.shiftId}-${slotIndex}`} className="border-b border-zinc-100">
                      <td className="px-3 py-2 text-zinc-900">{proposal.siteName}</td>
                      <td className="num px-3 py-2 text-zinc-600">{formatDay(proposal.date)}</td>
                      <td className="num px-3 py-2 text-zinc-600">
                        {formatTimeInParis(proposal.startAt)}–{formatTimeInParis(proposal.endAt)}
                      </td>
                      <td className="px-3 py-2">
                        <select
                          name={`assign:${proposal.shiftId}:${slotIndex}`}
                          defaultValue={slot.proposed?.id ?? ""}
                          className="field field-sm min-h-9"
                        >
                          <option value="">Ne pas affecter</option>
                          {slot.proposed && (
                            <option value={slot.proposed.id}>{describeCandidate(slot.proposed)}</option>
                          )}
                          {slot.alternatives.map((candidate) => (
                            <option key={candidate.id} value={candidate.id}>
                              {describeCandidate(candidate)}
                            </option>
                          ))}
                          {!slot.proposed && slot.alternatives.length === 0 && (
                            <option value="" disabled>
                              Aucun agent disponible
                            </option>
                          )}
                        </select>
                      </td>
                    </tr>
                  )),
                )}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between text-sm text-zinc-600">
            <span>
              {totalProposed}/{totalSlots} créneau{totalSlots > 1 ? "x" : ""} avec une proposition
            </span>
            <button type="submit" className="btn btn-primary">
              Valider les affectations
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
