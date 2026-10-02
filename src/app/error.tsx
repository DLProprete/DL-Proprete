"use client";

import Link from "next/link";

// Filet de toutes les pages (back-office, agent, connexion, portail) : jamais
// l'écran d'erreur brut de Next. L'erreur serveur est déjà journalisée par
// src/instrumentation.ts ; la référence (digest) permet de la retrouver
// dans /audit (« Erreur serveur »).
export default function ErrorPage({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <div className="flex min-h-full flex-1 items-center justify-center p-6">
      <div className="max-w-sm space-y-3 text-center">
        <h1 className="text-lg font-semibold text-zinc-900">Une erreur est survenue</h1>
        <p className="text-sm text-zinc-600">
          L&apos;action n&apos;a pas pu aboutir. Réessayez ; si le problème continue, signalez-le en donnant la
          référence ci-dessous.
        </p>
        {error.digest && <p className="text-xs text-zinc-500">Référence : {error.digest}</p>}
        <div className="flex items-center justify-center gap-4 pt-1">
          <button type="button" onClick={() => retry()} className="btn btn-dark">
            Réessayer
          </button>
          <Link href="/" className="text-sm text-brand-700 underline">
            Retour à l&apos;accueil
          </Link>
        </div>
      </div>
    </div>
  );
}
