import { redirect } from "next/navigation";
import { requireSession } from "@/server/auth/session";
import { getCompanyProfile } from "@/server/settings/queries";
import { updateCompanyProfileAction } from "./actions";

export default async function SettingsPage() {
  const user = await requireSession();
  if (user.role !== "ADMIN") {
    redirect("/");
  }
  const company = await getCompanyProfile();

  return (
    <div className="max-w-lg space-y-4">
      <h1 className="text-xl font-semibold">Paramètres entreprise</h1>
      <p className="text-sm text-zinc-500">
        Ces informations apparaissent en pied de page des factures PDF.
      </p>
      <form action={updateCompanyProfileAction} className="space-y-4">
        <div>
          <label htmlFor="legalName" className="block text-sm text-zinc-700">
            Raison sociale
          </label>
          <input
            id="legalName"
            name="legalName"
            required
            defaultValue={company.legalName}
            className="mt-1 w-full rounded border border-zinc-300 px-3 py-2"
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
            defaultValue={company.address}
            className="mt-1 w-full rounded border border-zinc-300 px-3 py-2"
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
              defaultValue={company.siret ?? ""}
              className="mt-1 w-full rounded border border-zinc-300 px-3 py-2"
            />
          </div>
          <div>
            <label htmlFor="vatNumber" className="block text-sm text-zinc-700">
              N° TVA
            </label>
            <input
              id="vatNumber"
              name="vatNumber"
              defaultValue={company.vatNumber ?? ""}
              className="mt-1 w-full rounded border border-zinc-300 px-3 py-2"
            />
          </div>
        </div>
        <div>
          <label htmlFor="iban" className="block text-sm text-zinc-700">
            IBAN
          </label>
          <input
            id="iban"
            name="iban"
            defaultValue={company.iban ?? ""}
            className="mt-1 w-full rounded border border-zinc-300 px-3 py-2"
          />
        </div>
        <button
          type="submit"
          className="rounded bg-teal-700 px-3 py-2 text-sm text-white hover:bg-teal-800"
        >
          Enregistrer
        </button>
      </form>
    </div>
  );
}
