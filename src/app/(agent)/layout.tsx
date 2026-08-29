import Link from "next/link";
import { redirect } from "next/navigation";
import { requireSession } from "@/server/auth/session";
import { logoutAction } from "../actions";

export default async function AgentLayout({ children }: { children: React.ReactNode }) {
  const user = await requireSession().catch(() => null);
  if (!user || user.role !== "AGENT") {
    redirect("/login");
  }

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <nav className="flex items-center justify-between border-b border-zinc-200 px-6 py-4">
        <div className="flex gap-4 text-sm font-medium">
          <Link href="/today">Aujourd&apos;hui</Link>
          <Link href="/absences">Absences</Link>
        </div>
        <form action={logoutAction}>
          <button type="submit" className="text-sm text-zinc-500 hover:text-zinc-900">
            Déconnexion
          </button>
        </form>
      </nav>
      <main className="flex-1 px-6 py-6">{children}</main>
    </div>
  );
}
