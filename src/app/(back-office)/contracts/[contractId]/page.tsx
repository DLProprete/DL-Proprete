import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSession } from "@/server/auth/session";
import { getContract } from "@/server/contracts/queries";
import { contractMonthlyProjection } from "@/server/contracts/projection";
import { formatTime } from "@/lib/dates";
import { setServiceTemplateActiveAction, createServiceExceptionAction } from "../actions";
import { ServiceTemplateForm } from "./ServiceTemplateForm";

const EXCEPTION_TYPE_LABELS: Record<string, string> = { SKIP: "Annulée", EXTRA: "Ajoutée" };

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Brouillon",
  ACTIVE: "Actif",
  SUSPENDED: "Suspendu",
  ENDED: "Terminé",
};

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
          <span className={contract.status === "ACTIVE" ? "text-green-700" : "text-zinc-400"}>
            {STATUS_LABELS[contract.status] ?? contract.status}
          </span>
        </div>
        <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          <dt className="text-zinc-500">Client</dt>
          <dd>
            <Link href={`/clients/${contract.client.id}`} className="underline">
              {contract.client.legalName}
            </Link>
          </dd>
          <dt className="text-zinc-500">Site</dt>
          <dd>
            <Link href={`/sites/${contract.site.id}`} className="underline">
              {contract.site.name}
            </Link>
          </dd>
          <dt className="text-zinc-500">Période</dt>
          <dd>
            {formatDate(contract.startsOn)} – {formatDate(contract.endsOn)}
          </dd>
          <dt className="text-zinc-500">Facturation</dt>
          <dd>{BILLING_BASIS_LABELS[contract.billingBasis] ?? contract.billingBasis}</dd>
          <dt className="text-zinc-500">Tarif horaire HT</dt>
          <dd>{contract.hourlyRateHT.toString()} €/h</dd>
          <dt className="text-zinc-500">Taux de TVA</dt>
          <dd>{contract.vatRate.toString()} %</dd>
          <dt className="text-zinc-500">Jour de facturation</dt>
          <dd>{contract.billingDayOfMonth}</dd>
          <dt className="text-zinc-500">Préavis de reconduction</dt>
          <dd>{contract.renewalNoticeDays} jours</dd>
          <dt className="text-zinc-500">Volume mensuel indicatif</dt>
          <dd>{contract.indicativeMonthlyHours ? `${contract.indicativeMonthlyHours.toString()} h` : "—"}</dd>
          <dt className="text-zinc-500">Notes</dt>
          <dd>{contract.notes ?? "—"}</dd>
        </dl>
        <div className="mt-4 rounded-lg border border-teal-100 bg-teal-50 px-4 py-3 text-sm text-teal-900">
          Ce contrat représente environ{" "}
          <span className="font-semibold">{projection.monthlyHours.toFixed(1)} h/mois</span> ≈{" "}
          <span className="font-semibold">{projection.monthlyAmountHT.toFixed(0)} € HT/mois</span>
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
                  <p className={template.isActive ? "" : "text-zinc-400"}>
                    <span className="font-medium">{template.name}</span> —{" "}
                    {template.daysOfWeek.map((day) => DAY_LABELS[day]).join(", ")}{" "}
                    {formatTime(template.startTime)}–{formatTime(template.endTime)}
                  </p>
                  <p className={template.isActive ? "text-sm text-zinc-500" : "text-sm text-zinc-400"}>
                    {template.durationMinutes} min facturées × {template.requiredAgents} agent
                    {template.requiredAgents > 1 ? "s" : ""} ={" "}
                    {((template.durationMinutes * template.requiredAgents) / 60)
                      .toFixed(2)
                      .replace(".", ",")}{" "}
                    h par passage
                  </p>
                  {template.instructions && (
                    <p className="text-zinc-500">{template.instructions}</p>
                  )}
                  {template.serviceExceptions.length > 0 && (
                    <ul className="mt-1 text-xs text-zinc-500">
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
                      className="rounded border border-zinc-300 px-2 py-1 text-xs"
                    />
                    <select
                      name="type"
                      defaultValue="SKIP"
                      className="rounded border border-zinc-300 px-2 py-1 text-xs"
                    >
                      <option value="SKIP">Annuler ce jour</option>
                      <option value="EXTRA">Ajouter ce jour</option>
                    </select>
                    <button
                      type="submit"
                      className="rounded border border-zinc-300 px-2 py-1 text-xs hover:bg-zinc-50"
                    >
                      Exception
                    </button>
                  </form>
                </div>
                <form action={toggleActive}>
                  <button type="submit" className="text-xs text-zinc-500 underline">
                    {template.isActive ? "Désactiver" : "Réactiver"}
                  </button>
                </form>
              </li>
            );
          })}
          {contract.serviceTemplates.length === 0 && (
            <li className="py-2 text-zinc-400">Aucune vacation pour l&apos;instant.</li>
          )}
        </ul>
      </div>

      <div>
        <h2 className="text-sm font-medium text-zinc-700">Ajouter une vacation</h2>
        {error && (
          <p className="mt-2 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}
        <ServiceTemplateForm contractId={contract.id} />
      </div>
    </div>
  );
}
