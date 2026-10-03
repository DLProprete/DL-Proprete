import Link from "next/link";
import { Logo } from "@/components/logo";
import { requestPasswordResetAction } from "./actions";

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ sent?: string; error?: string }>;
}) {
  const { sent, error } = await searchParams;

  return (
    <div className="flex flex-1 items-center justify-center bg-zinc-50">
      <div className="w-full max-w-sm space-y-4 rounded border border-zinc-200 bg-white p-6 shadow-sm">
        <Logo />
        <h1 className="text-lg font-semibold text-zinc-900">Mot de passe oublié</h1>
        {sent === "1" ? (
          <p role="status" className="text-sm text-zinc-700">
            Si un compte existe pour cette adresse, un e-mail vient de partir avec un lien pour choisir un nouveau mot
            de passe. Le lien est valable 30 minutes. Pensez à regarder dans les indésirables.
          </p>
        ) : (
          <form action={requestPasswordResetAction} className="space-y-4">
            {error === "rate_limit" && (
              <p role="alert" className="text-sm text-red-600">
                Trop de demandes, réessayez dans un quart d&apos;heure.
              </p>
            )}
            {error === "invalid" && (
              <p role="alert" className="text-sm text-red-600">
                Ce lien est invalide ou a expiré. Demandez-en un nouveau.
              </p>
            )}
            <p className="text-sm text-zinc-600">
              Indiquez l&apos;e-mail de votre compte : vous recevrez un lien pour choisir un nouveau mot de passe.
            </p>
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
            <button type="submit" className="btn btn-primary w-full">
              Recevoir le lien
            </button>
          </form>
        )}
        <Link href="/login" className="block text-center text-sm text-zinc-600 underline">
          Retour à la connexion
        </Link>
      </div>
    </div>
  );
}
