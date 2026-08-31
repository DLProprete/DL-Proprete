import Link from "next/link";
import { requireSession } from "@/server/auth/session";
import { listMyAbsences, getMyLeaveBalance } from "@/server/absences/queries";
import { parisToday } from "@/lib/dates";
import { ABSENCE_TYPE_LABELS, ABSENCE_STATUS_LABELS, ABSENCE_STATUS_TONE } from "./labels";
import { Badge } from "@/components/badge";

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("fr-FR").format(date);
}

export default async function MyAbsencesPage() {
  const user = await requireSession();
  const currentYear = parisToday().year;
  const [absences, leaveBalance] = await Promise.all([
    listMyAbsences(user),
    getMyLeaveBalance(user, currentYear),
  ]);

  return (
    <div className="max-w-lg space-y-4">
      <h1 className="text-xl font-semibold">Mes absences</h1>

      <div className="rounded-xl border border-zinc-200 bg-white p-4 text-sm">
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">
          Congés payés {currentYear}
        </p>
        {leaveBalance.acquired !== null ? (
          <p className="mt-1">
            <span className="font-semibold">{leaveBalance.acquired - leaveBalance.taken} j</span>{" "}
            restants — {leaveBalance.acquired} j acquis, {leaveBalance.taken} j pris.
          </p>
        ) : (
          <p className="mt-1 text-zinc-500">
            {leaveBalance.taken} j pris — solde acquis non renseigné, demandez à votre employeur.
          </p>
        )}
      </div>

      <ul className="divide-y divide-zinc-100 text-sm">
        {absences.map((absence) => (
          <li key={absence.id} className="flex items-center justify-between gap-4 py-3">
            <div>
              <p className="font-medium">{ABSENCE_TYPE_LABELS[absence.type] ?? absence.type}</p>
              <p className="text-zinc-500">
                {formatDate(absence.startsOn)} – {formatDate(absence.endsOn)}
              </p>
            </div>
            <Badge
              tone={ABSENCE_STATUS_TONE[absence.status] ?? "neutral"}
              label={ABSENCE_STATUS_LABELS[absence.status] ?? absence.status}
            />
          </li>
        ))}
        {absences.length === 0 && (
          <li className="py-3 text-zinc-400">Aucune absence déclarée.</li>
        )}
      </ul>
      <Link
        href="/absences/new"
        className="flex min-h-14 w-full items-center justify-center rounded-xl bg-teal-700 text-base font-semibold text-white hover:bg-teal-800"
      >
        Déclarer
      </Link>
    </div>
  );
}
