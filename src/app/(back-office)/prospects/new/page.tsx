import { createProspectAction } from "../actions";

export default function NewProspectPage() {
  return (
    <div className="max-w-lg space-y-4">
      <h1 className="text-xl font-semibold">Nouveau prospect</h1>
      <form action={createProspectAction} className="card space-y-4">
        <div>
          <label htmlFor="legalName" className="block text-sm text-zinc-700">
            Raison sociale
          </label>
          <input
            id="legalName"
            name="legalName"
            required
            className="mt-1 w-full field"
          />
        </div>
        <div>
          <label htmlFor="contactName" className="block text-sm text-zinc-700">
            Nom du contact
          </label>
          <input
            id="contactName"
            name="contactName"
            className="mt-1 w-full field"
          />
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
              className="mt-1 w-full field"
            />
          </div>
        </div>
        <div>
          <label htmlFor="address" className="block text-sm text-zinc-700">
            Adresse
          </label>
          <input
            id="address"
            name="address"
            className="mt-1 w-full field"
          />
        </div>
        <div>
          <label htmlFor="source" className="block text-sm text-zinc-700">
            Source
          </label>
          <input
            id="source"
            name="source"
            placeholder="Recommandation, site web, salon..."
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
            className="mt-1 w-full field"
          />
        </div>
        <button
          type="submit"
          className="btn btn-dark"
        >
          Créer le prospect
        </button>
      </form>
    </div>
  );
}
