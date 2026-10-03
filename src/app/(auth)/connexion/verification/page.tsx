import { redirect } from "next/navigation";
import { Logo } from "@/components/logo";
import { logoutAction } from "@/app/actions";
import { pendingTwoFactorSession } from "@/server/auth/session";
import { twoFactorChallenge } from "@/server/auth/two-factor";
import { verifyTwoFactorAction } from "./actions";

// Deuxième étape de connexion d'un ADMIN : code à 6 chiffres de
// l'application d'authentification. Au premier passage, la page fait
// d'abord enregistrer le compte dans l'application.
export default async function TwoFactorPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const pending = await pendingTwoFactorSession();
  if (!pending) redirect("/");
  const challenge = await twoFactorChallenge(pending.userId);

  return (
    <div className="flex flex-1 items-center justify-center bg-zinc-50 px-4">
      <div className="w-full max-w-sm space-y-4 rounded border border-zinc-200 bg-white p-6 shadow-sm">
        <Logo />
        <h1 className="text-lg font-semibold text-zinc-900">Double authentification</h1>

        {challenge.kind === "enroll" && (
          <div className="space-y-3 text-sm text-zinc-700">
            <p>
              Votre compte administrateur est protégé par un code à 6 chiffres. Première fois : ajoutez-le à une
              application d&apos;authentification (trousseau de l&apos;iPhone, Google Authenticator, Authy…).
            </p>
            <ol className="list-decimal space-y-2 pl-5">
              <li>
                Sur votre téléphone, touchez{" "}
                <a href={challenge.uri} className="font-medium underline">
                  ajouter à mon application d&apos;authentification
                </a>
                .
              </li>
              <li>
                Ou, dans l&apos;application, choisissez « saisir une clé » et recopiez :
                <code className="mt-1 block break-all rounded bg-zinc-100 px-2 py-1 font-mono text-xs tracking-wider">
                  {challenge.secret.match(/.{1,4}/g)?.join(" ")}
                </code>
              </li>
              <li>Saisissez ci-dessous le code à 6 chiffres affiché par l&apos;application.</li>
            </ol>
          </div>
        )}
        {challenge.kind === "verify" && (
          <p className="text-sm text-zinc-700">
            Saisissez le code à 6 chiffres affiché par votre application d&apos;authentification.
          </p>
        )}

        <form action={verifyTwoFactorAction} className="space-y-4">
          {error === "code" && (
            <p role="alert" className="text-sm text-red-600">
              Code incorrect. Vérifiez l&apos;heure de votre téléphone et réessayez.
            </p>
          )}
          {error === "rate_limit" && (
            <p role="alert" className="text-sm text-red-600">
              Trop d&apos;essais, réessayez dans un quart d&apos;heure.
            </p>
          )}
          <div>
            <label htmlFor="code" className="block text-sm text-zinc-700">
              Code
            </label>
            <input
              id="code"
              name="code"
              required
              inputMode="numeric"
              pattern="[0-9 ]{6,7}"
              maxLength={7}
              autoComplete="one-time-code"
              autoFocus
              className="mt-1 w-full field text-center font-mono text-lg tracking-widest"
            />
          </div>
          <button type="submit" className="btn btn-primary w-full">
            Valider
          </button>
        </form>

        <form action={logoutAction}>
          <button type="submit" className="block w-full text-center text-sm text-zinc-600 underline">
            Annuler et se déconnecter
          </button>
        </form>
        <p className="text-xs text-zinc-500">
          Téléphone perdu ? Un administrateur technique peut réinitialiser l&apos;accès (npm run password:reset).
        </p>
      </div>
    </div>
  );
}
