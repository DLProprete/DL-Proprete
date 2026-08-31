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
          className="btn btn-primary"
        >
          Nouveau membre
        </Link>
      </div>
      <div className="card-table">
        <table>
          <thead>
            <tr>
              <th>Nom</th>
              <th>Rôle</th>
              <th>Téléphone</th>
              <th>Permis</th>
              <th>Statut</th>
            </tr>
          </thead>
          <tbody>
            {agents.map((agent) => (
              <tr key={agent.id}>
                <td>
                  <Link href={`/team/${agent.id}`} className="text-zinc-900 underline">
                    {agent.firstName} {agent.lastName}
                  </Link>
                </td>
                <td className="text-zinc-600">{agent.role === "PLANNER" ? "Planificateur" : "Agent"}</td>
                <td className="text-zinc-600">{agent.phone ?? "—"}</td>
                <td className="text-zinc-600">{agent.hasDrivingLicense ? "Oui" : "Non"}</td>
                <td>
                  <Badge tone={agent.isActive ? "success" : "muted"} label={agent.isActive ? "Actif" : "Désactivé"} />
                </td>
              </tr>
            ))}
            {agents.length === 0 && (
              <tr>
                <td colSpan={5} className="text-zinc-500">
                  Aucun membre pour l&apos;instant.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
