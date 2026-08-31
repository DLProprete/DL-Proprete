import { redirect } from "next/navigation";
import { requireSession } from "@/server/auth/session";
import { getCompanyProfile } from "@/server/settings/queries";
import { describeMissingMentions, missingLegalMentions } from "@/server/billing/legal-mentions";
import { updateCompanyProfileAction } from "./actions";

export default async function SettingsPage() {
  const user = await requireSession();
  if (user.role !== "ADMIN") {
    redirect("/");
  }
  const company = await getCompanyProfile();
  const missing = missingLegalMentions({
    legalName: company.legalName,
    address: company.address,
    legalForm: company.legalForm,
    shareCapital: company.shareCapital === null ? null : Number(company.shareCapital),
    rcsCity: company.rcsCity,
    siret: company.siret,
    vatNumber: company.vatNumber,
    iban: company.iban,
    latePenaltyRate: company.latePenaltyRate === null ? null : Number(company.latePenaltyRate),
  });

  return (
    <div className="max-w-lg space-y-4">
      <h1 className="text-xl font-semibold">Paramètres entreprise</h1>
      <p className="text-sm text-zinc-500">
        Ces informations composent l&apos;en-tête et les mentions légales des factures PDF.
      </p>
      {missing.length > 0 && (
        <div className="rounded border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          <p className="font-medium">Mentions légales incomplètes</p>
          <p className="mt-1">
            Manque : {describeMissingMentions(missing)}. Une facture émise ne se corrige que par un
            avoir : compléter avant la prochaine émission.
          </p>
        </div>
      )}
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
            <label htmlFor="legalForm" className="block text-sm text-zinc-700">
              Forme juridique
            </label>
            <input
              id="legalForm"
              name="legalForm"
              placeholder="SAS"
              defaultValue={company.legalForm ?? ""}
              className="mt-1 w-full rounded border border-zinc-300 px-3 py-2"
            />
          </div>
          <div>
            <label htmlFor="shareCapital" className="block text-sm text-zinc-700">
              Capital social (€)
            </label>
            <input
              id="shareCapital"
              name="shareCapital"
              type="number"
              step="0.01"
              min="0"
              defaultValue={company.shareCapital === null ? "" : String(company.shareCapital)}
              className="mt-1 w-full rounded border border-zinc-300 px-3 py-2"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="rcsCity" className="block text-sm text-zinc-700">
              Ville du RCS
            </label>
            <input
              id="rcsCity"
              name="rcsCity"
              placeholder="Caen"
              defaultValue={company.rcsCity ?? ""}
              className="mt-1 w-full rounded border border-zinc-300 px-3 py-2"
            />
            <p className="mt-1 text-xs text-zinc-400">
              Le SIREN affiché à côté est déduit du SIRET.
            </p>
          </div>
          <div>
            <label htmlFor="latePenaltyRate" className="block text-sm text-zinc-700">
              Pénalités de retard (% / an)
            </label>
            <input
              id="latePenaltyRate"
              name="latePenaltyRate"
              type="number"
              step="0.01"
              min="0"
              defaultValue={company.latePenaltyRate === null ? "" : String(company.latePenaltyRate)}
              className="mt-1 w-full rounded border border-zinc-300 px-3 py-2"
            />
            <p className="mt-1 text-xs text-zinc-400">
              Laisser vide applique le repli légal : trois fois le taux d&apos;intérêt légal.
            </p>
          </div>
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
          <p className="mt-1 text-xs text-zinc-400">
            Sans IBAN sur la facture, le client n&apos;a aucun moyen de payer.
          </p>
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
