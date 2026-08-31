import { notFound } from "next/navigation";
import { requireSession } from "@/server/auth/session";
import { getAgent } from "@/server/team/queries";
import { AgentProfileFields } from "../AgentProfileFields";
import { setAgentActiveAction, updateAgentProfileAction, resetAgentPasswordAction } from "../actions";

export default async function AgentDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ agentId: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { agentId } = await params;
  const { error } = await searchParams;
  const user = await requireSession();
  const agent = await getAgent(user, agentId);

  if (!agent) {
    notFound();
  }

  const toggleActive = setAgentActiveAction.bind(null, agent.id, !agent.isActive);
  const updateProfile = updateAgentProfileAction.bind(null, agent.id);
  const resetPassword = resetAgentPasswordAction.bind(null, agent.id);

  return (
    <div className="max-w-lg space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">
            {agent.firstName} {agent.lastName}
          </h1>
          <p className="text-sm text-zinc-500">
            {agent.role === "PLANNER" ? "Planificateur" : "Agent"}
          </p>
        </div>
        <form action={toggleActive}>
          <button
            type="submit"
            className="rounded border border-zinc-300 px-3 py-2 text-sm hover:bg-zinc-50"
          >
            {agent.isActive ? "Désactiver" : "Réactiver"}
          </button>
        </form>
      </div>

      {error && (
        <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <form action={updateProfile} className="space-y-4">
        <AgentProfileFields
          defaultValues={agent}
          initialRole={agent.role === "PLANNER" ? "PLANNER" : "AGENT"}
        />
        <button
          type="submit"
          className="rounded bg-zinc-900 px-3 py-2 text-sm text-white hover:bg-zinc-800"
        >
          Enregistrer
        </button>
      </form>

      <div className="border-t border-zinc-200 pt-4">
        <h2 className="text-sm font-medium text-zinc-700">Réinitialiser le mot de passe</h2>
        <form action={resetPassword} className="mt-2 flex items-end gap-2">
          <div className="flex-1">
            <label htmlFor="password" className="block text-sm text-zinc-700">
              Nouveau mot de passe
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              minLength={8}
              className="mt-1 w-full rounded border border-zinc-300 px-3 py-2"
            />
          </div>
          <button
            type="submit"
            className="rounded border border-zinc-300 px-3 py-2 text-sm hover:bg-zinc-50"
          >
            Réinitialiser
          </button>
        </form>
      </div>
    </div>
  );
}
