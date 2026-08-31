import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSession } from "@/server/auth/session";
import { getClient } from "@/server/clients/queries";
import { setClientActiveAction } from "../actions";

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ clientId: string }>;
}) {
  const { clientId } = await params;
  const user = await requireSession();
  const client = await getClient(user, clientId);

  if (!client) {
    notFound();
  }

  const toggleActive = setClientActiveAction.bind(null, client.id, !client.isActive);

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">{client.legalName}</h1>
        <form action={toggleActive}>
          <button
            type="submit"
            className="btn btn-secondary"
          >
            {client.isActive ? "Désactiver" : "Réactiver"}
          </button>
        </form>
      </div>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
        <dt className="text-zinc-600">Statut</dt>
        <dd>{client.isActive ? "Actif" : "Désactivé"}</dd>
        <dt className="text-zinc-600">Nom commercial</dt>
        <dd>{client.tradeName ?? "—"}</dd>
        <dt className="text-zinc-600">Adresse de facturation</dt>
        <dd>{client.billingAddress}</dd>
        <dt className="text-zinc-600">SIRET</dt>
        <dd>{client.siret ?? "—"}</dd>
        <dt className="text-zinc-600">N° TVA</dt>
        <dd>{client.vatNumber ?? "—"}</dd>
        <dt className="text-zinc-600">E-mail</dt>
        <dd>{client.email ?? "—"}</dd>
        <dt className="text-zinc-600">Téléphone</dt>
        <dd>{client.phone ?? "—"}</dd>
        <dt className="text-zinc-600">Délai de paiement</dt>
        <dd>{client.paymentTermDays} jours</dd>
      </dl>

      <div>
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-zinc-700">Sites</h2>
          <Link href={`/sites/new?clientId=${client.id}`} className="text-sm underline">
            Ajouter un site
          </Link>
        </div>
        <ul className="mt-2 divide-y divide-zinc-100 text-sm">
          {client.sites.map((site) => (
            <li key={site.id} className="py-2">
              <Link href={`/sites/${site.id}`} className="text-zinc-900 underline">
                {site.name}
              </Link>
              <span className="ml-2 text-zinc-500">{site.city}</span>
            </li>
          ))}
          {client.sites.length === 0 && (
            <li className="py-2 text-zinc-500">Aucun site pour l&apos;instant.</li>
          )}
        </ul>
      </div>
    </div>
  );
}
