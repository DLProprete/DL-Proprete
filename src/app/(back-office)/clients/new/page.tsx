import { createClientAction } from "../actions";

export default function NewClientPage() {
  return (
    <div className="max-w-lg space-y-4">
      <h1 className="text-xl font-semibold">Nouveau client</h1>
      <form action={createClientAction} className="space-y-4">
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
          <label htmlFor="tradeName" className="block text-sm text-zinc-700">
            Nom commercial
          </label>
          <input
            id="tradeName"
            name="tradeName"
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
          <label htmlFor="paymentTermDays" className="block text-sm text-zinc-700">
            Délai de paiement (jours)
          </label>
          <input
            id="paymentTermDays"
            name="paymentTermDays"
            type="number"
            min={0}
            defaultValue={30}
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
          Créer le client
        </button>
      </form>
    </div>
  );
}
