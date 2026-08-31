import Link from "next/link";
import { requireSession } from "@/server/auth/session";
import { listClients } from "@/server/clients/queries";
import { Badge } from "@/components/badge";

export default async function ClientsPage() {
  const user = await requireSession();
  const clients = await listClients(user);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Clients</h1>
        <Link
          href="/clients/new"
          className="btn btn-primary"
        >
          Nouveau client
        </Link>
      </div>
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-zinc-200 text-zinc-600">
            <th className="py-2 font-medium">Raison sociale</th>
            <th className="font-medium">Adresse de facturation</th>
            <th className="font-medium">Statut</th>
          </tr>
        </thead>
        <tbody>
          {clients.map((client) => (
            <tr key={client.id} className="border-b border-zinc-100">
              <td className="py-2">
                <Link href={`/clients/${client.id}`} className="text-zinc-900 underline">
                  {client.legalName}
                </Link>
              </td>
              <td className="text-zinc-600">{client.billingAddress}</td>
              <td>
                <Badge tone={client.isActive ? "success" : "muted"} label={client.isActive ? "Actif" : "Désactivé"} />
              </td>
            </tr>
          ))}
          {clients.length === 0 && (
            <tr>
              <td colSpan={3} className="py-4 text-zinc-500">
                Aucun client pour l&apos;instant.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
