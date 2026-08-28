import Link from "next/link";
import { requireSession } from "@/server/auth/session";
import { listSites } from "@/server/sites/queries";

export default async function SitesPage() {
  const user = await requireSession();
  const sites = await listSites(user);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Sites</h1>
        <Link
          href="/sites/new"
          className="rounded bg-zinc-900 px-3 py-2 text-sm text-white hover:bg-zinc-800"
        >
          Nouveau site
        </Link>
      </div>
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-zinc-200 text-zinc-500">
            <th className="py-2 font-medium">Nom</th>
            <th className="font-medium">Client</th>
            <th className="font-medium">Ville</th>
            <th className="font-medium">Statut</th>
          </tr>
        </thead>
        <tbody>
          {sites.map((site) => (
            <tr key={site.id} className="border-b border-zinc-100">
              <td className="py-2">
                <Link href={`/sites/${site.id}`} className="text-zinc-900 underline">
                  {site.name}
                </Link>
              </td>
              <td className="text-zinc-600">{site.client.legalName}</td>
              <td className="text-zinc-600">{site.city}</td>
              <td>
                <span className={site.isActive ? "text-green-700" : "text-zinc-400"}>
                  {site.isActive ? "Actif" : "Désactivé"}
                </span>
              </td>
            </tr>
          ))}
          {sites.length === 0 && (
            <tr>
              <td colSpan={4} className="py-4 text-zinc-400">
                Aucun site pour l&apos;instant.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
