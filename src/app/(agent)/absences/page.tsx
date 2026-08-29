import Link from "next/link";
import { requireSession } from "@/server/auth/session";
import { listMyAbsences } from "@/server/absences/queries";
import { ABSENCE_TYPE_LABELS, ABSENCE_STATUS_LABELS } from "./labels";

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("fr-FR").format(date);
}

export default async function MyAbsencesPage() {
  const user = await requireSession();
  const absences = await listMyAbsences(user);

  return (
    <div className="max-w-lg space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Mes absences</h1>
        <Link
          href="/absences/new"
          className="rounded bg-zinc-900 px-3 py-2 text-sm text-white hover:bg-zinc-800"
        >
          Déclarer
        </Link>
      </div>
      <ul className="divide-y divide-zinc-100 text-sm">
        {absences.map((absence) => (
          <li key={absence.id} className="py-3">
            <p className="font-medium">{ABSENCE_TYPE_LABELS[absence.type] ?? absence.type}</p>
            <p className="text-zinc-500">
              {formatDate(absence.startsOn)} – {formatDate(absence.endsOn)} ·{" "}
              {ABSENCE_STATUS_LABELS[absence.status] ?? absence.status}
            </p>
          </li>
        ))}
        {absences.length === 0 && (
          <li className="py-3 text-zinc-400">Aucune absence déclarée.</li>
        )}
      </ul>
    </div>
  );
}
