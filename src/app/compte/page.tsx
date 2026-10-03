import Link from "next/link";
import { redirect } from "next/navigation";
import { Logo } from "@/components/logo";
import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH, PASSWORD_RULES_ATTRIBUTE } from "@/lib/password-policy";
import { requireSession } from "@/server/auth/session";
import { updateMyEmailAction, updateMyPasswordAction } from "./actions";

// Page commune à tous les rôles (même principe que /display) : chacun
// change ses propres identifiants. Les champs portent les attributs
// autocomplete attendus par les trousseaux (iCloud, Google, gestionnaires
// de mots de passe) pour proposer, générer et enregistrer le mot de passe.
// /.well-known/change-password redirige ici (next.config.ts).
export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const { saved, error } = await searchParams;
  const user = await requireSession().catch(() => null);
  if (!user) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-full flex-1 flex-col bg-brand-50">
      <header className="flex items-center justify-between gap-4 bg-brand-700 px-6 py-3">
        <Logo tone="blanc" className="h-5" />
        <Link
          href="/"
          className="inline-flex min-h-[var(--tap-min)] items-center rounded px-2 text-sm text-white/80 hover:bg-white/10 hover:text-white focus-visible:outline-white"
        >
          ← Retour
        </Link>
      </header>
      <main className="app-main mx-auto w-full max-w-lg flex-1 space-y-4 px-6 py-6">
        <h1 className="text-xl font-semibold">Mon compte</h1>

        {saved === "email" && (
          <p role="status" className="alert alert-info">
            E-mail de connexion mis à jour. Vos autres appareils ont été déconnectés.
          </p>
        )}
        {saved === "password" && (
          <p role="status" className="alert alert-info">
            Mot de passe changé. Vos autres appareils ont été déconnectés.
          </p>
        )}
        {error === "current_password" && (
          <p role="alert" className="alert alert-danger">
            Mot de passe actuel incorrect.
          </p>
        )}
        {error && error !== "current_password" && (
          <p role="alert" className="alert alert-danger">
            {error}
          </p>
        )}

        <form action={updateMyPasswordAction} className="card space-y-3">
          <h2 className="text-base font-semibold">Changer le mot de passe</h2>
          {/* Identifiant invisible : le trousseau sait à quel compte
              rattacher le nouveau mot de passe. */}
          <input type="text" name="username" autoComplete="username" value={user.email} readOnly hidden />
          <div>
            <label htmlFor="currentPassword" className="block text-sm text-zinc-700">
              Mot de passe actuel
            </label>
            <input
              id="currentPassword"
              name="currentPassword"
              type="password"
              required
              autoComplete="current-password"
              className="mt-1 w-full field"
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
              {PASSWORD_MIN_LENGTH} caractères minimum. Le plus simple : accepter le mot de passe fort proposé par
              votre téléphone ou votre navigateur, qui l&apos;enregistre dans votre trousseau.
            </p>
          </div>
          <button type="submit" className="btn btn-primary">
            Changer le mot de passe
          </button>
        </form>

        <form action={updateMyEmailAction} className="card space-y-3">
          <h2 className="text-base font-semibold">Changer l&apos;e-mail de connexion</h2>
          <div>
            <label htmlFor="email" className="block text-sm text-zinc-700">
              Nouvel e-mail
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="username"
              defaultValue={user.email}
              className="mt-1 w-full field"
            />
          </div>
          <div>
            <label htmlFor="emailCurrentPassword" className="block text-sm text-zinc-700">
              Mot de passe actuel
            </label>
            <input
              id="emailCurrentPassword"
              name="currentPassword"
              type="password"
              required
              autoComplete="current-password"
              className="mt-1 w-full field"
            />
          </div>
          <button type="submit" className="btn btn-secondary">
            Changer l&apos;e-mail
          </button>
        </form>
      </main>
    </div>
  );
}
