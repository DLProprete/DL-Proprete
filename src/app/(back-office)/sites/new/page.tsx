import { requireSession } from "@/server/auth/session";
import { listClients } from "@/server/clients/queries";
import { createSiteAction } from "../actions";

export default async function NewSitePage({
  searchParams,
}: {
  searchParams: Promise<{ clientId?: string }>;
}) {
  const { clientId } = await searchParams;
  const user = await requireSession();
  const clients = await listClients(user);

  return (
    <div className="max-w-lg space-y-4">
      <h1 className="text-xl font-semibold">Nouveau site</h1>
      <form action={createSiteAction} className="space-y-4">
        <div>
          <label htmlFor="clientId" className="block text-sm text-zinc-700">
            Client
          </label>
          <select
            id="clientId"
            name="clientId"
            required
            defaultValue={clientId ?? ""}
            className="mt-1 w-full field"
          >
            <option value="" disabled>
              Sélectionner un client
            </option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.legalName}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="name" className="block text-sm text-zinc-700">
            Nom du site
          </label>
          <input
            id="name"
            name="name"
            required
            className="mt-1 w-full field"
          />
        </div>
        <div>
          <label htmlFor="address" className="block text-sm text-zinc-700">
            Adresse
          </label>
          <input
            id="address"
            name="address"
            required
            className="mt-1 w-full field"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="postalCode" className="block text-sm text-zinc-700">
              Code postal
            </label>
            <input
              id="postalCode"
              name="postalCode"
              required
              className="mt-1 w-full field"
            />
          </div>
          <div>
            <label htmlFor="city" className="block text-sm text-zinc-700">
              Ville
            </label>
            <input
              id="city"
              name="city"
              required
              className="mt-1 w-full field"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="onSiteContactName" className="block text-sm text-zinc-700">
              Contact sur site
            </label>
            <input
              id="onSiteContactName"
              name="onSiteContactName"
              className="mt-1 w-full field"
            />
          </div>
          <div>
            <label htmlFor="onSiteContactPhone" className="block text-sm text-zinc-700">
              Téléphone du contact
            </label>
            <input
              id="onSiteContactPhone"
              name="onSiteContactPhone"
              className="mt-1 w-full field"
            />
          </div>
        </div>
        <div>
          <label htmlFor="accessNotes" className="block text-sm text-zinc-700">
            Consignes d&apos;accès
          </label>
          <textarea
            id="accessNotes"
            name="accessNotes"
            rows={3}
            className="mt-1 w-full field"
          />
        </div>
        <button
          type="submit"
          className="btn btn-dark"
        >
          Créer le site
        </button>
      </form>
    </div>
  );
}
