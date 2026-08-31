import { requireSession } from "@/server/auth/session";
import { listSites } from "@/server/sites/queries";
import { createContractAction } from "../actions";

export default async function NewContractPage({
  searchParams,
}: {
  searchParams: Promise<{ siteId?: string; error?: string }>;
}) {
  const { siteId, error } = await searchParams;
  const user = await requireSession();
  const sites = await listSites(user);

  return (
    <div className="max-w-lg space-y-4">
      <h1 className="text-xl font-semibold">Nouveau contrat</h1>
      {error === "overlap" && (
        <p className="alert alert-danger">
          Un contrat actif existe déjà sur ce site pour une période qui chevauche.
        </p>
      )}
      <form action={createContractAction} className="space-y-4">
        <div>
          <label htmlFor="siteId" className="block text-sm text-zinc-700">
            Site
          </label>
          <select
            id="siteId"
            name="siteId"
            required
            defaultValue={siteId ?? ""}
            className="mt-1 w-full field"
          >
            <option value="" disabled>
              Sélectionner un site
            </option>
            {sites.map((site) => (
              <option key={site.id} value={site.id}>
                {site.client.legalName} — {site.name}
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
          <label htmlFor="hourlyRateHT" className="block text-sm text-zinc-700">
            Tarif horaire HT (€)
          </label>
          <input
            id="hourlyRateHT"
            name="hourlyRateHT"
            type="number"
            step="0.01"
            min="0"
            required
            className="mt-1 w-full field"
          />
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
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="billingBasis" className="block text-sm text-zinc-700">
              Base de facturation
            </label>
            <select
              id="billingBasis"
              name="billingBasis"
              defaultValue="CALENDAR_SHIFTS"
              className="mt-1 w-full field"
            >
              <option value="CALENDAR_SHIFTS">Vacations du mois (régie au prévu)</option>
              <option value="FLAT_INDICATIVE_HOURS">Forfait mensuel fixe</option>
            </select>
          </div>
          <div>
            <label htmlFor="indicativeMonthlyHours" className="block text-sm text-zinc-700">
              Heures mensuelles (si forfait)
            </label>
            <input
              id="indicativeMonthlyHours"
              name="indicativeMonthlyHours"
              type="number"
              step="0.01"
              min="0"
              className="mt-1 w-full field"
            />
          </div>
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
          Créer le contrat
        </button>
      </form>
    </div>
  );
}
