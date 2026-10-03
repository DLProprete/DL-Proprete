import Link from "next/link";
import { loginAction } from "./actions";
import { Logo } from "@/components/logo";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; reset?: string }>;
}) {
  const { error, reset } = await searchParams;

  return (
    <div className="flex flex-1 items-center justify-center bg-zinc-50">
      <form
        action={loginAction}
        className="w-full max-w-sm space-y-4 rounded border border-zinc-200 bg-white p-6 shadow-sm"
      >
        <Logo />
        <h1 className="text-lg font-semibold text-zinc-900">Connexion</h1>
        {reset === "1" && (
          <p role="status" className="text-sm text-green-700">
            Mot de passe changé. Connectez-vous avec le nouveau.
          </p>
        )}
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
            autoComplete="username"
            className="mt-1 w-full field"
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
            className="mt-1 w-full field"
          />
        </div>
        <button
          type="submit"
          className="btn btn-primary w-full"
        >
          Se connecter
        </button>
        <Link href="/mot-de-passe-oublie" className="block text-center text-sm text-zinc-600 underline">
          Mot de passe oublié ?
        </Link>
      </form>
    </div>
  );
}
