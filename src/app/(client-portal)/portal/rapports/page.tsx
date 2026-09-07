import { requireClientSession } from "@/server/client-portal/session";
import { listMySiteReports } from "@/server/client-portal/queries";

const LOG_TYPES: Record<string, string> = {
  ANOMALY: "Anomalie",
  EQUIPMENT: "Matériel",
  OTHER: "Autre",
};

export default async function PortalReportsPage() {
  const session = await requireClientSession();
  const reports = await listMySiteReports(session.clientId);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Rapports de visite</h1>
      <ul className="space-y-3">
        {reports.map((report) => (
          <li key={report.id} className="card text-sm">
            <p className="text-xs text-zinc-500">
              {report.site.name} — {LOG_TYPES[report.type] ?? report.type} —{" "}
              {new Intl.DateTimeFormat("fr-FR", { dateStyle: "short", timeStyle: "short" }).format(
                report.createdAt,
              )}
            </p>
            <p className="mt-1 text-zinc-900">{report.comment}</p>
            {report.photoPath && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={`/api/client-portal/site-logs/${report.id}/photo`}
                alt=""
                className="mt-2 max-h-48 rounded"
              />
            )}
          </li>
        ))}
        {reports.length === 0 && (
          <li className="text-zinc-500">Aucun rapport de visite pour l&apos;instant.</li>
        )}
      </ul>
    </div>
  );
}
