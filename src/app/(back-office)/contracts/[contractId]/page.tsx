import Link from "next/link";
import { notFound } from "next/navigation";
import { Clock, Euro } from "lucide-react";
import { requireSession } from "@/server/auth/session";
import { getContract } from "@/server/contracts/queries";
import { contractMonthlyProjection } from "@/server/contracts/projection";
import { formatTime } from "@/lib/dates";
import { Badge } from "@/components/badge";
import { CONTRACT_STATUS_LABELS, CONTRACT_STATUS_TONE } from "@/lib/contract-status";
import { setServiceTemplateActiveAction, createServiceExceptionAction } from "../actions";
import { ServiceTemplateForm } from "./ServiceTemplateForm";

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

  const projection = contractMonthlyProjection({
    billingBasis: contract.billingBasis,
    hourlyRateHT: Number(contract.hourlyRateHT),
    indicativeMonthlyHours: contract.indicativeMonthlyHours ? Number(contract.indicativeMonthlyHours) : null,
    serviceTemplates: contract.serviceTemplates,
  });

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
        <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          <dt className="text-zinc-600">Client</dt>
          <dd>
            <Link href={`/clients/${contract.client.id}`} className="underline">
              {contract.client.legalName}
            </Link>
          </dd>
          <dt className="text-zinc-600">Site</dt>
          <dd>
            <Link href={`/sites/${contract.site.id}`} className="underline">
              {contract.site.name}
            </Link>
          </dd>
          <dt className="text-zinc-600">Période</dt>
          <dd>
            {formatDate(contract.startsOn)} – {formatDate(contract.endsOn)}
          </dd>
          <dt className="text-zinc-600">Facturation</dt>
          <dd>{BILLING_BASIS_LABELS[contract.billingBasis] ?? contract.billingBasis}</dd>
          <dt className="text-zinc-600">Tarif horaire HT</dt>
          <dd>{contract.hourlyRateHT.toString()} €/h</dd>
          <dt className="text-zinc-600">Taux de TVA</dt>
          <dd>{contract.vatRate.toString()} %</dd>
          <dt className="text-zinc-600">Jour de facturation</dt>
          <dd>{contract.billingDayOfMonth}</dd>
          <dt className="text-zinc-600">Préavis de reconduction</dt>
          <dd>{contract.renewalNoticeDays} jours</dd>
          <dt className="text-zinc-600">Volume mensuel indicatif</dt>
          <dd>{contract.indicativeMonthlyHours ? `${contract.indicativeMonthlyHours.toString()} h` : "—"}</dd>
          <dt className="text-zinc-600">Notes</dt>
          <dd>{contract.notes ?? "—"}</dd>
        </dl>
        <div className="mt-4 grid grid-cols-2 gap-3">
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
      </div>

      <div>
        <h2 className="text-sm font-medium text-zinc-700">Vacations hebdomadaires</h2>
        <ul className="mt-2 divide-y divide-zinc-100 text-sm">
          {contract.serviceTemplates.map((template) => {
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
          {contract.serviceTemplates.length === 0 && (
            <li className="py-2 text-zinc-500">Aucune vacation pour l&apos;instant.</li>
          )}
        </ul>
      </div>

      <div>
        <h2 className="text-sm font-medium text-zinc-700">Ajouter une vacation</h2>
        {error && (
          <p className="mt-2 alert alert-danger">
            {error}
          </p>
        )}
        <ServiceTemplateForm contractId={contract.id} />
      </div>
    </div>
  );
}
