import { requireSession } from "@/server/auth/session";
import { listClients } from "@/server/clients/queries";
import { createContractAction } from "../actions";

export default async function NewContractPage({
  searchParams,
}: {
  searchParams: Promise<{ clientId?: string; error?: string }>;
}) {
  const { clientId, error } = await searchParams;
  const user = await requireSession();
  const clients = await listClients(user);

  return (
    <div className="max-w-lg space-y-4">
      <h1 className="text-xl font-semibold">Nouveau contrat-cadre</h1>
      <p className="text-sm text-zinc-600">
        Le contrat-cadre couvre un client ; les sites (et leur tarif propre) s&apos;ajoutent
        ensuite depuis la fiche du contrat.
      </p>
      {error && (
        <p className="alert alert-danger">
          {error}
        </p>
      )}
      <form action={createContractAction} className="card space-y-4">
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
          <label htmlFor="reference" className="block text-sm text-zinc-700">
            Référence
          </label>
          <input
            id="reference"
            name="reference"
            required
            placeholder="C-2026-001"
            className="mt-1 w-full field"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="startsOn" className="block text-sm text-zinc-700">
              Début
            </label>
            <input
              id="startsOn"
              name="startsOn"
              type="date"
              required
              className="mt-1 w-full field"
            />
          </div>
          <div>
            <label htmlFor="endsOn" className="block text-sm text-zinc-700">
              Fin
            </label>
            <input
              id="endsOn"
              name="endsOn"
              type="date"
              required
              className="mt-1 w-full field"
            />
          </div>
        </div>
        <div>
          <label htmlFor="status" className="block text-sm text-zinc-700">
            Statut initial
          </label>
          <select
            id="status"
            name="status"
            defaultValue="DRAFT"
            className="mt-1 w-full field"
          >
            <option value="DRAFT">Brouillon</option>
            <option value="ACTIVE">Actif</option>
          </select>
        </div>
        <div>
          <label htmlFor="notes" className="block text-sm text-zinc-700">
            Notes
          </label>
          <textarea
            id="notes"
            name="notes"
            rows={3}
            className="mt-1 w-full field"
          />
        </div>
        <button
          type="submit"
          className="btn btn-dark"
        >
          Créer le contrat-cadre
        </button>
      </form>
    </div>
  );
}
