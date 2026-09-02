import Link from "next/link";
import { requireSession } from "@/server/auth/session";
import { listProspects } from "@/server/prospects/queries";
import { Badge } from "@/components/badge";
import { prospectStatusBadge } from "@/lib/prospect-status";
import { dateOnlyUTC, parisToday } from "@/lib/dates";

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("fr-FR").format(date);
}

export default async function ProspectsPage() {
  const user = await requireSession();
  const prospects = await listProspects(user);
  const today = parisToday();
  const todayDate = dateOnlyUTC(today.year, today.month, today.day);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Prospects</h1>
        <Link
          href="/prospects/new"
          className="btn btn-primary"
        >
          Nouveau prospect
        </Link>
      </div>
      <div className="card-table">
        <table>
          <thead>
            <tr>
              <th>Raison sociale</th>
              <th>Contact</th>
              <th>Relance</th>
              <th>Statut</th>
            </tr>
          </thead>
          <tbody>
            {prospects.map((prospect) => (
              <tr key={prospect.id}>
                <td>
                  <Link href={`/prospects/${prospect.id}`} className="text-zinc-900 underline">
                    {prospect.legalName}
                  </Link>
                </td>
                <td className="text-zinc-600">{prospect.contactName ?? "—"}</td>
                <td className="text-zinc-600">
                  {prospect.nextFollowUpAt ? formatDate(prospect.nextFollowUpAt) : "—"}
                </td>
                <td>
                  <Badge {...prospectStatusBadge(prospect, todayDate)} />
                </td>
              </tr>
            ))}
            {prospects.length === 0 && (
              <tr>
                <td colSpan={4} className="text-zinc-500">
                  Aucun prospect pour l&apos;instant.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
