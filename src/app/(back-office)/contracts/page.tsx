import Link from "next/link";
import { requireSession } from "@/server/auth/session";
import { listContracts } from "@/server/contracts/queries";
import { Badge, type BadgeTone } from "@/components/badge";

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Brouillon",
  ACTIVE: "Actif",
  SUSPENDED: "Suspendu",
  ENDED: "Terminé",
};

const STATUS_TONE: Record<string, BadgeTone> = {
  ACTIVE: "success",
  DRAFT: "neutral",
  SUSPENDED: "warning",
  ENDED: "muted",
};

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("fr-FR").format(date);
}

export default async function ContractsPage() {
  const user = await requireSession();
  const contracts = await listContracts(user);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Contrats</h1>
        <Link
          href="/contracts/new"
          className="rounded bg-teal-700 px-3 py-2 text-sm text-white hover:bg-teal-800"
        >
          Nouveau contrat
        </Link>
      </div>
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-zinc-200 text-zinc-500">
            <th className="py-2 font-medium">Référence</th>
            <th className="font-medium">Client</th>
            <th className="font-medium">Site</th>
            <th className="font-medium">Période</th>
            <th className="font-medium">Tarif HT</th>
            <th className="font-medium">Statut</th>
          </tr>
        </thead>
        <tbody>
          {contracts.map((contract) => (
            <tr key={contract.id} className="border-b border-zinc-100">
              <td className="py-2">
                <Link href={`/contracts/${contract.id}`} className="text-zinc-900 underline">
                  {contract.reference}
                </Link>
              </td>
              <td className="text-zinc-600">{contract.client.legalName}</td>
              <td className="text-zinc-600">{contract.site.name}</td>
              <td className="text-zinc-600">
                {formatDate(contract.startsOn)} – {formatDate(contract.endsOn)}
              </td>
              <td className="text-zinc-600">{contract.hourlyRateHT.toString()} €/h</td>
              <td>
                <Badge
                  tone={STATUS_TONE[contract.status] ?? "neutral"}
                  label={STATUS_LABELS[contract.status] ?? contract.status}
                />
              </td>
            </tr>
          ))}
          {contracts.length === 0 && (
            <tr>
              <td colSpan={6} className="py-4 text-zinc-400">
                Aucun contrat pour l&apos;instant.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
