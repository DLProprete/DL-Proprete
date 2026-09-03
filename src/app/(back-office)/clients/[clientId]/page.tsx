import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSession } from "@/server/auth/session";
import { getClient } from "@/server/clients/queries";
import { setClientActiveAction, sendPortalLinkAction, updateClientAction } from "../actions";

const PORTAL_ERROR_MESSAGES: Record<string, string> = {
  "no-email": "Ce client n'a pas d'adresse e-mail renseignée — à compléter avant d'envoyer un lien.",
};

export default async function ClientDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ clientId: string }>;
  searchParams: Promise<{ portalSent?: string; portalError?: string; updated?: string }>;
}) {
  const { clientId } = await params;
  const { portalSent, portalError, updated } = await searchParams;
  const user = await requireSession();
  const client = await getClient(user, clientId);

  if (!client) {
    notFound();
  }

  const toggleActive = setClientActiveAction.bind(null, client.id, !client.isActive);
  const sendPortalLink = sendPortalLinkAction.bind(null, client.id);
  const updateClient = updateClientAction.bind(null, client.id);

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

      {updated && <p className="alert alert-info">Fiche client enregistrée.</p>}
      {portalSent && <p className="alert alert-info">Lien d&apos;accès envoyé.</p>}
      {portalError && (
        <p className="alert alert-danger">
          {PORTAL_ERROR_MESSAGES[portalError] ?? portalError}
        </p>
      )}

      <p className="text-sm text-zinc-600">
        Statut : {client.isActive ? "Actif" : "Désactivé"}
      </p>

      <form action={updateClient} className="card space-y-4">
        <div>
          <label htmlFor="legalName" className="block text-sm text-zinc-700">
            Raison sociale
          </label>
          <input
            id="legalName"
            name="legalName"
            required
            defaultValue={client.legalName}
            className="mt-1 w-full field"
          />
        </div>
        <div>
          <label htmlFor="tradeName" className="block text-sm text-zinc-700">
            Nom commercial
          </label>
          <input
            id="tradeName"
            name="tradeName"
            defaultValue={client.tradeName ?? ""}
            className="mt-1 w-full field"
          />
        </div>
        <div>
          <label htmlFor="billingAddress" className="block text-sm text-zinc-700">
            Adresse de facturation
          </label>
          <input
            id="billingAddress"
            name="billingAddress"
            required
            defaultValue={client.billingAddress}
            className="mt-1 w-full field"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="siret" className="block text-sm text-zinc-700">
              SIRET
            </label>
            <input
              id="siret"
              name="siret"
              defaultValue={client.siret ?? ""}
              className="mt-1 w-full field"
            />
          </div>
          <div>
            <label htmlFor="vatNumber" className="block text-sm text-zinc-700">
              N° TVA
            </label>
            <input
              id="vatNumber"
              name="vatNumber"
              defaultValue={client.vatNumber ?? ""}
              className="mt-1 w-full field"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="email" className="block text-sm text-zinc-700">
              E-mail
            </label>
            <input
              id="email"
              name="email"
              type="email"
              defaultValue={client.email ?? ""}
              className="mt-1 w-full field"
            />
          </div>
          <div>
            <label htmlFor="phone" className="block text-sm text-zinc-700">
              Téléphone
            </label>
            <input
              id="phone"
              name="phone"
              defaultValue={client.phone ?? ""}
              className="mt-1 w-full field"
            />
          </div>
        </div>
        <div>
          <label htmlFor="paymentTermDays" className="block text-sm text-zinc-700">
            Délai de paiement (jours)
          </label>
          <input
            id="paymentTermDays"
            name="paymentTermDays"
            type="number"
            min={0}
            defaultValue={client.paymentTermDays}
            className="mt-1 w-full field"
          />
        </div>
        <div>
          <label htmlFor="notes" className="block text-sm text-zinc-700">
            Notes
          </label>
          <textarea
            id="notes"
            name="notes"
            rows={3}
            defaultValue={client.notes ?? ""}
            className="mt-1 w-full field"
          />
        </div>
        {client.email && (
          <button formAction={sendPortalLink} type="submit" className="text-sm text-brand-700 underline">
            Envoyer un lien d&apos;accès à l&apos;espace client
          </button>
        )}
        <div>
          <button
            type="submit"
            className="btn btn-dark"
          >
            Enregistrer
          </button>
        </div>
      </form>

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
