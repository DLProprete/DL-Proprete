import Link from "next/link";

// Distinct de /login : une session valide mais un rôle qui n'a pas accès à
// la section demandée. Rediriger vers /login dans ce cas laissait croire à
// une session expirée, alors qu'il s'agit d'un rôle insuffisant.
export default function UnauthorizedPage() {
  return (
    <div className="flex min-h-full flex-1 items-center justify-center p-6">
      <div className="max-w-sm space-y-2 text-center">
        <h1 className="text-lg font-semibold text-zinc-900">Accès non autorisé</h1>
        <p className="text-sm text-zinc-500">
          Votre compte n&apos;a pas les droits nécessaires pour accéder à cette page.
        </p>
        <Link href="/login" className="inline-block pt-2 text-sm text-teal-700 underline">
          Retour à la connexion
        </Link>
      </div>
    </div>
  );
}
