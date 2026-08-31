import { AgentProfileFields } from "../AgentProfileFields";
import { createAgentAction } from "../actions";

export default async function NewAgentPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="max-w-lg space-y-4">
      <h1 className="text-xl font-semibold">Nouveau membre de l&apos;équipe</h1>
      {error && (
        <p className="alert alert-danger">
          {error}
        </p>
      )}
      <form action={createAgentAction} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm text-zinc-700">
            E-mail
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            className="mt-1 w-full field"
          />
        </div>
        <div>
          <label htmlFor="password" className="block text-sm text-zinc-700">
            Mot de passe initial
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            minLength={8}
            className="mt-1 w-full field"
          />
        </div>
        <AgentProfileFields roleSelectable />
        <button
          type="submit"
          className="rounded bg-zinc-900 px-3 py-2 text-sm text-white hover:bg-zinc-800"
        >
          Créer
        </button>
      </form>
    </div>
  );
}
