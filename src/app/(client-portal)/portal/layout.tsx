import Link from "next/link";
import { requireClientSession } from "@/server/client-portal/session";
import { logoutPortalAction } from "./actions";
import { Logo } from "@/components/logo";

const NAV_LINKS = [
  { href: "/portal", label: "Factures" },
  { href: "/portal/rapports", label: "Rapports de visite" },
];

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
        <div className="flex items-center gap-3">
          <Logo />
          <span className="text-sm text-zinc-500">Espace client</span>
        </div>
        <form action={logoutPortalAction}>
          <button type="submit" className="text-sm text-zinc-600 underline">
            Déconnexion
          </button>
        </form>
      </header>
      <nav className="flex gap-4 border-b border-zinc-200 bg-white px-6 text-sm">
        {NAV_LINKS.map((link) => (
          <Link key={link.href} href={link.href} className="py-3 text-zinc-600 hover:text-zinc-900">
            {link.label}
          </Link>
        ))}
      </nav>
      <main className="flex-1 px-6 py-6">{children}</main>
    </div>
  );
}
