import Link from "next/link";
import { requireSession } from "@/server/auth/session";
import { listSites } from "@/server/sites/queries";
import { Badge } from "@/components/badge";

export default async function SitesPage() {
  const user = await requireSession();
  const sites = await listSites(user);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Sites</h1>
        <Link
          href="/sites/new"
          className="btn btn-primary"
        >
          Nouveau site
        </Link>
      </div>
      <div className="card-table">
        <table>
          <thead>
            <tr>
              <th>Nom</th>
              <th>Client</th>
              <th>Ville</th>
              <th>Statut</th>
            </tr>
          </thead>
          <tbody>
            {sites.map((site) => (
              <tr key={site.id}>
                <td>
                  <Link href={`/sites/${site.id}`} className="text-zinc-900 underline">
                    {site.name}
                  </Link>
                </td>
                <td className="text-zinc-600">{site.client.legalName}</td>
                <td className="text-zinc-600">{site.city}</td>
                <td>
                  <Badge tone={site.isActive ? "success" : "muted"} label={site.isActive ? "Actif" : "Désactivé"} />
                </td>
              </tr>
            ))}
            {sites.length === 0 && (
              <tr>
                <td colSpan={4} className="text-zinc-500">
                  Aucun site pour l&apos;instant.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
