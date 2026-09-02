import Link from "next/link";
import { requireSession } from "@/server/auth/session";
import { listContracts } from "@/server/contracts/queries";
import { Badge } from "@/components/badge";
import { CONTRACT_STATUS_LABELS, CONTRACT_STATUS_TONE } from "@/lib/contract-status";

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
          className="btn btn-primary"
        >
          Nouveau contrat
        </Link>
      </div>
      <div className="card-table">
        <table>
          <thead>
            <tr>
              <th>Référence</th>
              <th>Client</th>
              <th>Sites</th>
              <th>Période</th>
              <th>Statut</th>
            </tr>
          </thead>
          <tbody>
            {contracts.map((contract) => (
              <tr key={contract.id}>
                <td>
                  <Link href={`/contracts/${contract.id}`} className="text-zinc-900 underline">
                    {contract.reference}
                  </Link>
                </td>
                <td className="text-zinc-600">{contract.client.legalName}</td>
                <td className="text-zinc-600">
                  {contract.contractSites.length > 0
                    ? contract.contractSites.map((cs) => cs.site.name).join(", ")
                    : "—"}
                </td>
                <td className="text-zinc-600">
                  {formatDate(contract.startsOn)} – {formatDate(contract.endsOn)}
                </td>
                <td>
                  <Badge
                    tone={CONTRACT_STATUS_TONE[contract.status] ?? "neutral"}
                    label={CONTRACT_STATUS_LABELS[contract.status] ?? contract.status}
                  />
                </td>
              </tr>
            ))}
            {contracts.length === 0 && (
              <tr>
                <td colSpan={5} className="text-zinc-500">
                  Aucun contrat pour l&apos;instant.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
