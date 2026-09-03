import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSession } from "@/server/auth/session";
import { getSite } from "@/server/sites/queries";
import { setSiteActiveAction, updateSiteAction } from "../actions";

const LOG_TYPES: Record<string, string> = {
  ANOMALY: "Anomalie",
  EQUIPMENT: "Matériel",
  OTHER: "Autre",
};

export default async function SiteDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ siteId: string }>;
  searchParams: Promise<{ saved?: string }>;
}) {
  const { siteId } = await params;
  const { saved } = await searchParams;
  const user = await requireSession();
  const site = await getSite(user, siteId);
  if (!site) notFound();

  const toggleActive = setSiteActiveAction.bind(null, site.id, !site.isActive);

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">{site.name}</h1>
        <form action={toggleActive}>
          <button type="submit" className="btn btn-secondary">
            {site.isActive ? "Désactiver" : "Réactiver"}
          </button>
        </form>
      </div>
      {saved && (
        <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
          Consignes enregistrées.
        </p>
      )}

      <p className="text-sm text-zinc-600">
        Client :{" "}
        <Link href={`/clients/${site.client.id}`} className="underline">{site.client.legalName}</Link>
        {" — "}{site.address}, {site.postalCode} {site.city}
      </p>

      <form action={updateSiteAction.bind(null, site.id)} className="card space-y-3">
        <input type="hidden" name="clientId" value={site.clientId} />
        <input type="hidden" name="name" value={site.name} />
        <input type="hidden" name="address" value={site.address} />
        <input type="hidden" name="city" value={site.city} />
        <input type="hidden" name="postalCode" value={site.postalCode} />
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm text-zinc-700" htmlFor="onSiteContactName">Contact sur site</label>
            <input id="onSiteContactName" name="onSiteContactName" defaultValue={site.onSiteContactName ?? ""} className="mt-1 w-full field" />
          </div>
          <div>
            <label className="block text-sm text-zinc-700" htmlFor="onSiteContactPhone">Téléphone</label>
            <input id="onSiteContactPhone" name="onSiteContactPhone" defaultValue={site.onSiteContactPhone ?? ""} className="mt-1 w-full field" />
          </div>
        </div>
        <div>
          <label className="block text-sm text-zinc-700" htmlFor="accessNotes">Accès</label>
          <textarea id="accessNotes" name="accessNotes" rows={2} defaultValue={site.accessNotes ?? ""} className="mt-1 w-full field" />
        </div>
        <div>
          <label className="block text-sm text-zinc-700" htmlFor="alarmCode">Code alarme</label>
          <input id="alarmCode" name="alarmCode" defaultValue={site.alarmCode ?? ""} className="mt-1 w-full field" />
        </div>
        <div>
          <label className="block text-sm text-zinc-700" htmlFor="keyNotes">Clés / badges</label>
          <textarea id="keyNotes" name="keyNotes" rows={2} defaultValue={site.keyNotes ?? ""} className="mt-1 w-full field" />
        </div>
        <div>
          <label className="block text-sm text-zinc-700" htmlFor="protocolNotes">Protocole</label>
          <textarea id="protocolNotes" name="protocolNotes" rows={3} defaultValue={site.protocolNotes ?? ""} className="mt-1 w-full field" />
        </div>
        <button type="submit" className="btn btn-dark">Enregistrer les consignes</button>
      </form>

      <div>
        <h2 className="text-sm font-medium text-zinc-700">Contrats</h2>
        <ul className="mt-2 divide-y divide-zinc-100 text-sm">
          {site.contractSites.map((contractSite) => (
            <li key={contractSite.id} className="py-2">
              <Link href={`/contracts/${contractSite.contract.id}`} className="underline">
                {contractSite.contract.reference}
              </Link>
              <span className="ml-2 text-zinc-500">{contractSite.contract.status}</span>
            </li>
          ))}
          {site.contractSites.length === 0 && <li className="py-2 text-zinc-500">Aucun contrat.</li>}
        </ul>
      </div>

      <div>
        <h2 className="text-sm font-medium text-zinc-700">Main courante</h2>
        <ul className="mt-2 space-y-3 text-sm">
          {site.logs.map((log) => (
            <li key={log.id} className="rounded-md border border-zinc-200 p-3">
              <p className="text-xs text-zinc-500">
                {LOG_TYPES[log.type] ?? log.type} — {log.user.firstName} {log.user.lastName} —{" "}
                {new Intl.DateTimeFormat("fr-FR", { dateStyle: "short", timeStyle: "short" }).format(log.createdAt)}
              </p>
              <p className="mt-1">{log.comment}</p>
              {log.photoPath && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={log.photoPath} alt="" className="mt-2 max-h-48 rounded" />
              )}
            </li>
          ))}
          {site.logs.length === 0 && <li className="text-zinc-500">Aucun événement.</li>}
        </ul>
      </div>
    </div>
  );
}
