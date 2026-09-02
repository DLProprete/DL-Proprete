import { requireClientSession } from "@/server/client-portal/session";
import { logoutPortalAction } from "./actions";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const session = await requireClientSession().catch(() => null);

  if (!session) {
    return (
      <div className="flex min-h-full flex-1 items-center justify-center bg-zinc-50 px-6 py-12">
        <div className="card max-w-sm text-center text-sm">
          <p className="font-medium text-zinc-900">Lien invalide ou expiré</p>
          <p className="mt-2 text-zinc-600">
            Contactez DL Propreté pour recevoir un nouveau lien d&apos;accès.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-full flex-1 flex-col bg-zinc-50">
      <header className="flex items-center justify-between border-b border-zinc-200 bg-white px-6 py-3">
        <span className="text-sm font-semibold text-zinc-900">DL Propreté — Espace client</span>
        <form action={logoutPortalAction}>
          <button type="submit" className="text-sm text-zinc-600 underline">
            Déconnexion
          </button>
        </form>
      </header>
      <main className="flex-1 px-6 py-6">{children}</main>
    </div>
  );
}
