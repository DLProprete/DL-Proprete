import Link from "next/link";
import { Logo } from "@/components/logo";
import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH, PASSWORD_RULES_ATTRIBUTE } from "@/lib/password-policy";
import { emailForResetToken } from "@/server/auth/password-reset";
import { resetPasswordAction } from "../actions";

// Ouvrir le lien ne consomme rien (les antivirus de messagerie ouvrent les
// liens avant le destinataire) : le jeton n'est consommé qu'à l'envoi du
// formulaire.
export default async function NewPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; error?: string }>;
}) {
  const { token = "", error } = await searchParams;
  const email = token ? await emailForResetToken(token) : null;

  return (
    <div className="flex flex-1 items-center justify-center bg-zinc-50">
      <div className="w-full max-w-sm space-y-4 rounded border border-zinc-200 bg-white p-6 shadow-sm">
        <Logo />
        <h1 className="text-lg font-semibold text-zinc-900">Nouveau mot de passe</h1>
        {!email ? (
          <>
            <p role="alert" className="text-sm text-red-600">
              Ce lien est invalide ou a expiré.
            </p>
            <Link href="/mot-de-passe-oublie" className="btn btn-primary w-full">
              Demander un nouveau lien
            </Link>
          </>
        ) : (
          <form action={resetPasswordAction} className="space-y-4">
            {error && (
              <p role="alert" className="text-sm text-red-600">
                {error}
              </p>
            )}
            <input type="hidden" name="token" value={token} />
            {/* Identifiant visible du trousseau : il rattache le nouveau mot
                de passe au bon compte. */}
            <div>
              <label htmlFor="username" className="block text-sm text-zinc-700">
                Compte
              </label>
              <input
                id="username"
                name="username"
                type="email"
                autoComplete="username"
                value={email}
                readOnly
                className="mt-1 w-full field bg-zinc-50"
              />
            </div>
            <div>
              <label htmlFor="newPassword" className="block text-sm text-zinc-700">
                Nouveau mot de passe
              </label>
              <input
                id="newPassword"
                name="newPassword"
                type="password"
                required
                minLength={PASSWORD_MIN_LENGTH}
                maxLength={PASSWORD_MAX_LENGTH}
                autoComplete="new-password"
                aria-describedby="newPasswordHelp"
                className="mt-1 w-full field"
                {...PASSWORD_RULES_ATTRIBUTE}
              />
              <p id="newPasswordHelp" className="mt-1 text-xs text-zinc-500">
                {PASSWORD_MIN_LENGTH} caractères minimum. Acceptez le mot de passe fort proposé par votre téléphone ou
                votre navigateur : il sera enregistré dans votre trousseau.
              </p>
            </div>
            <button type="submit" className="btn btn-primary w-full">
              Enregistrer le mot de passe
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
