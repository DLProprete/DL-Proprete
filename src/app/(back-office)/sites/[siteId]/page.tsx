import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSession } from "@/server/auth/session";
import { getSite } from "@/server/sites/queries";
import { setSiteActiveAction } from "../actions";

export default async function SiteDetailPage({
  params,
}: {
  params: Promise<{ siteId: string }>;
}) {
  const { siteId } = await params;
  const user = await requireSession();
  const site = await getSite(user, siteId);

  if (!site) {
    notFound();
  }

  const toggleActive = setSiteActiveAction.bind(null, site.id, !site.isActive);

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">{site.name}</h1>
        <form action={toggleActive}>
          <button
            type="submit"
            className="rounded border border-zinc-300 px-3 py-2 text-sm hover:bg-zinc-50"
          >
            {site.isActive ? "Désactiver" : "Réactiver"}
          </button>
        </form>
      </div>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
        <dt className="text-zinc-500">Statut</dt>
        <dd>{site.isActive ? "Actif" : "Désactivé"}</dd>
        <dt className="text-zinc-500">Client</dt>
        <dd>
          <Link href={`/clients/${site.client.id}`} className="underline">
            {site.client.legalName}
          </Link>
        </dd>
        <dt className="text-zinc-500">Adresse</dt>
        <dd>
          {site.address}, {site.postalCode} {site.city}
        </dd>
        <dt className="text-zinc-500">Contact sur site</dt>
        <dd>{site.onSiteContactName ?? "—"}</dd>
        <dt className="text-zinc-500">Téléphone du contact</dt>
        <dd>{site.onSiteContactPhone ?? "—"}</dd>
        <dt className="text-zinc-500">Consignes d&apos;accès</dt>
        <dd>{site.accessNotes ?? "—"}</dd>
      </dl>
    </div>
  );
}
