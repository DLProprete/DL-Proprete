import Link from "next/link";
import { requireSession } from "@/server/auth/session";
import { listMyAbsences } from "@/server/absences/queries";
import { ABSENCE_TYPE_LABELS, ABSENCE_STATUS_LABELS, ABSENCE_STATUS_TONE } from "./labels";
import { Badge } from "@/components/badge";

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("fr-FR").format(date);
}

export default async function MyAbsencesPage() {
  const user = await requireSession();
  const absences = await listMyAbsences(user);

  return (
    <div className="max-w-lg space-y-4">
      <h1 className="text-xl font-semibold">Mes absences</h1>
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
