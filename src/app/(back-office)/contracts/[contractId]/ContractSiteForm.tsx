"use client";

import { useState } from "react";
import { createContractSiteAction } from "../actions";

type SiteOption = { id: string; name: string };

export function ContractSiteForm({
  contractId,
  sites,
}: {
  contractId: string;
  sites: SiteOption[];
}) {
  const [billingBasis, setBillingBasis] = useState("FLAT_INDICATIVE_HOURS");

  return (
    <form action={createContractSiteAction} className="mt-2 space-y-4">
      <input type="hidden" name="contractId" value={contractId} />
      <div>
        <label htmlFor="siteId" className="block text-sm text-zinc-700">
          Site
        </label>
        <select
          id="siteId"
          name="siteId"
          required
          defaultValue=""
          className="mt-1 w-full field"
        >
          <option value="" disabled>
            Sélectionner un site
          </option>
          {sites.map((site) => (
            <option key={site.id} value={site.id}>
              {site.name}
            </option>
          ))}
        </select>
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
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="billingBasis" className="block text-sm text-zinc-700">
            Base de facturation
          </label>
          <select
            id="billingBasis"
            name="billingBasis"
            value={billingBasis}
            onChange={(event) => setBillingBasis(event.target.value)}
            className="mt-1 w-full field"
          >
            <option value="FLAT_INDICATIVE_HOURS">Forfait mensuel fixe</option>
            <option value="CALENDAR_SHIFTS">Vacations du mois (régie au prévu)</option>
          </select>
        </div>
        <div>
          <label htmlFor="indicativeMonthlyHours" className="block text-sm text-zinc-700">
            Heures mensuelles {billingBasis === "FLAT_INDICATIVE_HOURS" ? "" : "(si forfait)"}
          </label>
          <input
            id="indicativeMonthlyHours"
            name="indicativeMonthlyHours"
            type="number"
            step="0.01"
            min="0"
            required={billingBasis === "FLAT_INDICATIVE_HOURS"}
            className="mt-1 w-full field"
          />
        </div>
      </div>
      <button type="submit" className="btn btn-dark">
        Ajouter le site
      </button>
    </form>
  );
}
