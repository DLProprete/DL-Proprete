import { loginAction } from "./actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="flex flex-1 items-center justify-center">
      <form
        action={loginAction}
        className="w-full max-w-sm space-y-4 rounded border border-zinc-200 p-6"
      >
        <h1 className="text-lg font-semibold">DL Propreté — Connexion</h1>
        {error === "rate_limit" && (
          <p className="text-sm text-red-600">Trop de tentatives, réessayez plus tard.</p>
        )}
        {error && error !== "rate_limit" && (
          <p className="text-sm text-red-600">Identifiants incorrects.</p>
        )}
        <div>
          <label htmlFor="email" className="block text-sm text-zinc-700">
            E-mail
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            className="mt-1 w-full rounded border border-zinc-300 px-3 py-2"
          />
        </div>
        <div>
          <label htmlFor="password" className="block text-sm text-zinc-700">
            Mot de passe
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            autoComplete="current-password"
            className="mt-1 w-full rounded border border-zinc-300 px-3 py-2"
          />
        </div>
        <button
          type="submit"
          className="w-full rounded bg-zinc-900 px-3 py-2 text-white hover:bg-zinc-800"
        >
          Se connecter
        </button>
      </form>
    </div>
  );
}
