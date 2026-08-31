import Link from "next/link";
import { redirect } from "next/navigation";
import { requireSession } from "@/server/auth/session";
import { listTeam } from "@/server/team/queries";
import { Badge } from "@/components/badge";

export default async function TeamPage() {
  const user = await requireSession();
  if (user.role !== "ADMIN") {
    redirect("/");
  }
  const agents = await listTeam(user);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Équipe</h1>
        <Link
          href="/team/new"
          className="rounded bg-teal-700 px-3 py-2 text-sm text-white hover:bg-teal-800"
        >
          Nouvel agent
        </Link>
      </div>
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-zinc-200 text-zinc-500">
            <th className="py-2 font-medium">Nom</th>
            <th className="font-medium">Téléphone</th>
            <th className="font-medium">Permis</th>
            <th className="font-medium">Statut</th>
          </tr>
        </thead>
        <tbody>
          {agents.map((agent) => (
            <tr key={agent.id} className="border-b border-zinc-100">
              <td className="py-2">
                <Link href={`/team/${agent.id}`} className="text-zinc-900 underline">
                  {agent.firstName} {agent.lastName}
                </Link>
              </td>
              <td className="text-zinc-600">{agent.phone ?? "—"}</td>
              <td className="text-zinc-600">{agent.hasDrivingLicense ? "Oui" : "Non"}</td>
              <td>
                <Badge tone={agent.isActive ? "success" : "muted"} label={agent.isActive ? "Actif" : "Désactivé"} />
              </td>
            </tr>
          ))}
          {agents.length === 0 && (
            <tr>
              <td colSpan={4} className="py-4 text-zinc-400">
                Aucun agent pour l&apos;instant.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
