import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSession } from "@/server/auth/session";
import { getClient } from "@/server/clients/queries";
import { setClientActiveAction, sendPortalLinkAction, updateClientAction } from "../actions";
import { SendPortalLinkButton } from "./SendPortalLinkButton";

const PORTAL_ERROR_MESSAGES: Record<string, string> = {
  "no-email": "Ce client n'a pas d'adresse e-mail renseignée — à compléter avant d'envoyer un lien.",
  "already-sent": "Un lien encore valable a déjà été envoyé. Attendez 15 minutes ou que le destinataire l'ouvre avant d'en renvoyer un.",
};

function display(value: string | null | undefined) {
  return value && value.trim() !== "" ? value : "—";
}

export default async function ClientDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ clientId: string }>;
  searchParams: Promise<{ portalSent?: string; portalError?: string; updated?: string; edit?: string }>;
}) {
  const { clientId } = await params;
  const { portalSent, portalError, updated, edit } = await searchParams;
  const user = await requireSession();
  const client = await getClient(user, clientId);

  if (!client) {
    notFound();
  }

  const isEditing = edit === "1";
  const toggleActive = setClientActiveAction.bind(null, client.id, !client.isActive);
  const sendPortalLink = sendPortalLinkAction.bind(null, client.id);
  const updateClient = updateClientAction.bind(null, client.id);

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center justify-between gap-3">
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
      {portalSent && (
        <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
          E-mail envoyé{client.email ? ` à ${client.email}` : ""}. Le lien est valable 15 minutes.
          Un nouveau lien ne pourra être envoyé qu&apos;après expiration ou utilisation.
        </p>
      )}
      {portalError && (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900">
          {PORTAL_ERROR_MESSAGES[portalError] ?? portalError}
        </p>
      )}

      {isEditing ? (
        <>
          <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
            Mode modification. Les changements ne sont pris en compte qu&apos;après
            <strong> Enregistrer</strong>. Un champ mal saisi (e-mail, adresse, SIRET)
            peut bloquer un envoi ou une facture. Vérifiez avant de valider.
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
            <div className="flex flex-wrap items-center gap-3">
              <button type="submit" className="btn btn-dark">
                Enregistrer
              </button>
              <Link href={`/clients/${client.id}`} className="text-sm underline">
                Annuler
              </Link>
            </div>
          </form>
        </>
      ) : (
        <>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <dt className="text-zinc-600">Statut</dt>
            <dd>{client.isActive ? "Actif" : "Désactivé"}</dd>
            <dt className="text-zinc-600">Nom commercial</dt>
            <dd>{display(client.tradeName)}</dd>
            <dt className="text-zinc-600">Adresse de facturation</dt>
            <dd>{display(client.billingAddress)}</dd>
            <dt className="text-zinc-600">SIRET</dt>
            <dd>{display(client.siret)}</dd>
            <dt className="text-zinc-600">N° TVA</dt>
            <dd>{display(client.vatNumber)}</dd>
            <dt className="text-zinc-600">E-mail</dt>
            <dd>{display(client.email)}</dd>
            <dt className="text-zinc-600">Téléphone</dt>
            <dd>{display(client.phone)}</dd>
            <dt className="text-zinc-600">Délai de paiement</dt>
            <dd>{client.paymentTermDays} jours</dd>
            <dt className="text-zinc-600">Notes</dt>
            <dd>{display(client.notes)}</dd>
          </dl>

          <Link href={`/clients/${client.id}?edit=1`} className="btn btn-secondary inline-flex">
            Modifier cette fiche
          </Link>
        </>
      )}

      {client.email ? (
        <form action={sendPortalLink} className="space-y-2">
          <SendPortalLinkButton />
          <p className="text-sm text-zinc-600">
            Un seul lien actif à la fois, valable 15 minutes.
          </p>
        </form>
      ) : (
        <p className="text-sm text-zinc-600">
          Renseignez et enregistrez un e-mail pour pouvoir envoyer un lien d&apos;accès.
        </p>
      )}

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
