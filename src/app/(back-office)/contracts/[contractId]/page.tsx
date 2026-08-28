import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSession } from "@/server/auth/session";
import { getContract } from "@/server/contracts/queries";
import { formatTime } from "@/lib/dates";
import { createServiceTemplateAction, setServiceTemplateActiveAction } from "../actions";

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Brouillon",
  ACTIVE: "Actif",
  SUSPENDED: "Suspendu",
  ENDED: "Terminé",
};

const DAY_LABELS = ["", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("fr-FR").format(date);
}

export default async function ContractDetailPage({
  params,
}: {
  params: Promise<{ contractId: string }>;
}) {
  const { contractId } = await params;
  const user = await requireSession();
  const contract = await getContract(user, contractId);

  if (!contract) {
    notFound();
  }

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
          <dd>Régie au prévu</dd>
          <dt className="text-zinc-500">Tarif horaire HT</dt>
          <dd>{contract.hourlyRateHT.toString()} €/h</dd>
          <dt className="text-zinc-500">Notes</dt>
          <dd>{contract.notes ?? "—"}</dd>
        </dl>
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
                    {formatTime(template.startTime)}–{formatTime(template.endTime)} (
                    {template.durationMinutes} min, {template.requiredAgents} agent
                    {template.requiredAgents > 1 ? "s" : ""})
                  </p>
                  {template.instructions && (
                    <p className="text-zinc-500">{template.instructions}</p>
                  )}
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
        <form action={createServiceTemplateAction} className="mt-2 space-y-4">
          <input type="hidden" name="contractId" value={contract.id} />
          <div>
            <label htmlFor="name" className="block text-sm text-zinc-700">
              Nom
            </label>
            <input
              id="name"
              name="name"
              required
              placeholder="Entretien quotidien bureaux"
              className="mt-1 w-full rounded border border-zinc-300 px-3 py-2"
            />
          </div>
          <fieldset>
            <legend className="block text-sm text-zinc-700">Jours</legend>
            <div className="mt-1 flex flex-wrap gap-3">
              {DAY_LABELS.slice(1).map((label, index) => (
                <label key={label} className="flex items-center gap-1 text-sm">
                  <input type="checkbox" name="daysOfWeek" value={index + 1} />
                  {label}
                </label>
              ))}
            </div>
          </fieldset>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="startTime" className="block text-sm text-zinc-700">
                Heure de début
              </label>
              <input
                id="startTime"
                name="startTime"
                type="time"
                required
                className="mt-1 w-full rounded border border-zinc-300 px-3 py-2"
              />
            </div>
            <div>
              <label htmlFor="endTime" className="block text-sm text-zinc-700">
                Heure de fin
              </label>
              <input
                id="endTime"
                name="endTime"
                type="time"
                required
                className="mt-1 w-full rounded border border-zinc-300 px-3 py-2"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="durationMinutes" className="block text-sm text-zinc-700">
                Durée estimée (min)
              </label>
              <input
                id="durationMinutes"
                name="durationMinutes"
                type="number"
                min={1}
                required
                className="mt-1 w-full rounded border border-zinc-300 px-3 py-2"
              />
            </div>
            <div>
              <label htmlFor="requiredAgents" className="block text-sm text-zinc-700">
                Agents requis
              </label>
              <input
                id="requiredAgents"
                name="requiredAgents"
                type="number"
                min={1}
                defaultValue={1}
                className="mt-1 w-full rounded border border-zinc-300 px-3 py-2"
              />
            </div>
          </div>
          <div>
            <label htmlFor="instructions" className="block text-sm text-zinc-700">
              Consignes
            </label>
            <textarea
              id="instructions"
              name="instructions"
              rows={3}
              className="mt-1 w-full rounded border border-zinc-300 px-3 py-2"
            />
          </div>
          <button
            type="submit"
            className="rounded bg-zinc-900 px-4 py-2 text-sm text-white hover:bg-zinc-800"
          >
            Ajouter la vacation
          </button>
        </form>
      </div>
    </div>
  );
}
