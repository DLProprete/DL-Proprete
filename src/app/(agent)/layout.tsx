import Link from "next/link";
import { redirect } from "next/navigation";
import { requireSession } from "@/server/auth/session";
import { AgentBottomNav } from "@/components/agent-nav";
import { OfflineBanner } from "@/components/offline-banner";
import { Logo } from "@/components/logo";
import { logoutAction } from "../actions";

export default async function AgentLayout({ children }: { children: React.ReactNode }) {
  const user = await requireSession().catch(() => null);
  if (!user) {
    redirect("/login");
  }
  if (user.role !== "AGENT") {
    redirect("/unauthorized");
  }

  return (
    <div className="flex min-h-full flex-1 flex-col bg-brand-50">
      <header className="bg-brand-700 px-6 py-3">
        <Logo tone="blanc" className="h-5" />
      </header>
      <main className="app-main flex-1 px-6 py-6 pb-24">
        <OfflineBanner />
        {children}
        <form action={logoutAction} className="mx-auto mt-8 w-full max-w-md text-center">
          <button type="submit" className="inline-flex min-h-[var(--tap-min)] items-center text-sm text-zinc-600 underline">
            Déconnexion
          </button>{" "}
          <Link href="/display" className="inline-flex min-h-[var(--tap-min)] items-center text-sm text-zinc-600 underline">
            Mon affichage
          </Link>
        </form>
      </main>
      <AgentBottomNav />
    </div>
  );
}
