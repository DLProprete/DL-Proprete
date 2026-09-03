import Link from "next/link";
import { notFound } from "next/navigation";
import { Clock, Euro } from "lucide-react";
import { requireSession } from "@/server/auth/session";
import { getContract } from "@/server/contracts/queries";
import { listSitesForClient } from "@/server/sites/queries";
import { contractMonthlyProjection } from "@/server/contracts/projection";
import { formatTime } from "@/lib/dates";
import { Badge } from "@/components/badge";
import { CONTRACT_STATUS_LABELS, CONTRACT_STATUS_TONE } from "@/lib/contract-status";
import {
  CONTRACT_SIGNATURE_STATUS_LABELS,
  CONTRACT_SIGNATURE_STATUS_TONE,
} from "@/lib/contract-signature-status";
import {
  setServiceTemplateActiveAction,
  createServiceExceptionAction,
  markContractSignatureSentAction,
  markContractSignatureSignedAction,
} from "../actions";
import { ServiceTemplateForm } from "./ServiceTemplateForm";
import { ContractSiteForm } from "./ContractSiteForm";

const EXCEPTION_TYPE_LABELS: Record<string, string> = { SKIP: "Annulée", EXTRA: "Ajoutée" };

const BILLING_BASIS_LABELS: Record<string, string> = {
  CALENDAR_SHIFTS: "Au calendrier (heures planifiées du mois)",
  FLAT_INDICATIVE_HOURS: "Forfait mensuel lissé",
};

const DAY_LABELS = ["", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("fr-FR").format(date);
}

export default async function ContractDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ contractId: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { contractId } = await params;
  const { error } = await searchParams;
  const user = await requireSession();
  const contract = await getContract(user, contractId);

  if (!contract) {
    notFound();
  }

  const availableSites = await listSitesForClient(user, contract.clientId);
  const usedSiteIds = new Set(contract.contractSites.map((cs) => cs.siteId));
  const sitesNotYetOnContract = availableSites.filter((site) => !usedSiteIds.has(site.id));

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">{contract.reference}</h1>
          <Badge
            tone={CONTRACT_STATUS_TONE[contract.status] ?? "neutral"}
            label={CONTRACT_STATUS_LABELS[contract.status] ?? contract.status}
          />
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <Badge
            tone={CONTRACT_SIGNATURE_STATUS_TONE[contract.signatureStatus] ?? "neutral"}
            label={`Signature : ${CONTRACT_SIGNATURE_STATUS_LABELS[contract.signatureStatus] ?? contract.signatureStatus}`}
          />
          <a
            href={`/api/contracts/${contract.id}/pdf`}
            target="_blank"
            rel="noreferrer"
            className="text-sm underline"
          >
            Télécharger le PDF
          </a>
          {contract.signatureStatus === "NOT_SENT" && (
            <form action={markContractSignatureSentAction.bind(null, contract.id)}>
              <button type="submit" className="btn btn-secondary btn-sm">
                Marquer comme envoyé à signer
              </button>
            </form>
          )}
          {contract.signatureStatus !== "SIGNED" && (
            <form action={markContractSignatureSignedAction.bind(null, contract.id)}>
              <button type="submit" className="btn btn-secondary btn-sm">
                Marquer comme signé
              </button>
            </form>
          )}
        </div>
        <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          <dt className="text-zinc-600">Client</dt>
          <dd>
            <Link href={`/clients/${contract.client.id}`} className="underline">
              {contract.client.legalName}
            </Link>
          </dd>
          <dt className="text-zinc-600">Période</dt>
          <dd>
            {formatDate(contract.startsOn)} – {formatDate(contract.endsOn)}
          </dd>
          <dt className="text-zinc-600">Jour de facturation</dt>
          <dd>{contract.billingDayOfMonth}</dd>
          <dt className="text-zinc-600">Préavis de reconduction</dt>
          <dd>{contract.renewalNoticeDays} jours</dd>
          <dt className="text-zinc-600">Notes</dt>
          <dd>{contract.notes ?? "—"}</dd>
        </dl>
      </div>

      {error && (
        <p className="alert alert-danger">
          {error === "overlap"
            ? "Un contrat actif existe déjà sur ce site pour une période qui chevauche."
            : error}
        </p>
      )}

      <div className="space-y-6">
        <h2 className="text-sm font-medium text-zinc-700">Sites de ce contrat</h2>
        {contract.contractSites.map((contractSite) => {
          const projection = contractMonthlyProjection({
            billingBasis: contractSite.billingBasis,
            hourlyRateHT: Number(contractSite.hourlyRateHT),
            indicativeMonthlyHours: contractSite.indicativeMonthlyHours
              ? Number(contractSite.indicativeMonthlyHours)
              : null,
            serviceTemplates: contractSite.serviceTemplates,
          });

          return (
            <div key={contractSite.id} className="card space-y-4">
              <div className="flex items-center justify-between">
                <Link href={`/sites/${contractSite.site.id}`} className="font-medium underline">
                  {contractSite.site.name}
                </Link>
              </div>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                <dt className="text-zinc-600">Facturation</dt>
                <dd>{BILLING_BASIS_LABELS[contractSite.billingBasis] ?? contractSite.billingBasis}</dd>
                <dt className="text-zinc-600">Tarif horaire HT</dt>
                <dd>{contractSite.hourlyRateHT.toString()} €/h</dd>
                <dt className="text-zinc-600">Taux de TVA</dt>
                <dd>{contractSite.vatRate.toString()} %</dd>
                <dt className="text-zinc-600">Volume mensuel indicatif</dt>
                <dd>
                  {contractSite.indicativeMonthlyHours
                    ? `${contractSite.indicativeMonthlyHours.toString()} h`
                    : "—"}
                </dd>
              </dl>
              <div className="grid grid-cols-2 gap-3">
                <div className="stat-card">
                  <span className="stat-badge stat-badge-blue">
                    <Clock size={18} strokeWidth={2} aria-hidden />
                  </span>
                  <span className="num text-2xl font-semibold text-zinc-900">
                    {projection.monthlyHours.toFixed(1)} h
                  </span>
                  <span className="text-sm text-zinc-600">Volume mensuel</span>
                </div>
                <div className="stat-card">
                  <span className="stat-badge stat-badge-aqua">
                    <Euro size={18} strokeWidth={2} aria-hidden />
                  </span>
                  <span className="num text-2xl font-semibold text-zinc-900">
                    {projection.monthlyAmountHT.toFixed(0)} €
                  </span>
                  <span className="text-sm text-zinc-600">Montant HT / mois</span>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium text-zinc-700">Vacations hebdomadaires</h3>
                <ul className="mt-2 divide-y divide-zinc-100 text-sm">
                  {contractSite.serviceTemplates.map((template) => {
                    const toggleActive = setServiceTemplateActiveAction.bind(
                      null,
                      contract.id,
                      template.id,
                      !template.isActive,
                    );
                    return (
                      <li key={template.id} className="flex items-center justify-between py-2">
                        <div>
                          <p className={template.isActive ? "" : "text-zinc-500"}>
                            <span className="font-medium">{template.name}</span> —{" "}
                            {template.daysOfWeek.map((day) => DAY_LABELS[day]).join(", ")}{" "}
                            {formatTime(template.startTime)}–{formatTime(template.endTime)}
                          </p>
                          <p className={template.isActive ? "text-sm text-zinc-600" : "text-sm text-zinc-500"}>
                            {template.durationMinutes} min facturées × {template.requiredAgents} agent
                            {template.requiredAgents > 1 ? "s" : ""} ={" "}
                            {((template.durationMinutes * template.requiredAgents) / 60)
                              .toFixed(2)
                              .replace(".", ",")}{" "}
                            h par passage
                          </p>
                          {template.instructions && (
                            <p className="text-zinc-600">{template.instructions}</p>
                          )}
                          {template.serviceExceptions.length > 0 && (
                            <ul className="mt-1 text-xs text-zinc-600">
                              {template.serviceExceptions.map((exception) => (
                                <li key={exception.id}>
                                  {formatDate(exception.date)} —{" "}
                                  {EXCEPTION_TYPE_LABELS[exception.type] ?? exception.type}
                                </li>
                              ))}
                            </ul>
                          )}
                          <form
                            action={createServiceExceptionAction.bind(null, contract.id, template.id)}
                            className="mt-1 flex items-center gap-2"
                          >
                            <input
                              type="date"
                              name="date"
                              required
                              className="field field-sm text-xs"
                            />
                            <select
                              name="type"
                              defaultValue="SKIP"
                              className="field field-sm text-xs"
                            >
                              <option value="SKIP">Annuler ce jour</option>
                              <option value="EXTRA">Ajouter ce jour</option>
                            </select>
                            <button
                              type="submit"
                              className="btn btn-secondary btn-xs"
                            >
                              Exception
                            </button>
                          </form>
                        </div>
                        <form action={toggleActive}>
                          <button type="submit" className="text-xs text-zinc-600 underline">
                            {template.isActive ? "Désactiver" : "Réactiver"}
                          </button>
                        </form>
                      </li>
                    );
                  })}
                  {contractSite.serviceTemplates.length === 0 && (
                    <li className="py-2 text-zinc-500">Aucune vacation pour l&apos;instant.</li>
                  )}
                </ul>
              </div>

              <div>
                <h3 className="text-sm font-medium text-zinc-700">Ajouter une vacation</h3>
                <ServiceTemplateForm contractId={contract.id} contractSiteId={contractSite.id} />
              </div>
            </div>
          );
        })}
        {contract.contractSites.length === 0 && (
          <p className="text-sm text-zinc-500">Aucun site sur ce contrat pour l&apos;instant.</p>
        )}
      </div>

      {sitesNotYetOnContract.length > 0 && (
        <div>
          <h2 className="text-sm font-medium text-zinc-700">Ajouter un site à ce contrat</h2>
          <ContractSiteForm contractId={contract.id} sites={sitesNotYetOnContract} />
        </div>
      )}
    </div>
  );
}
