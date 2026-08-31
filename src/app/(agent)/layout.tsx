import { redirect } from "next/navigation";
import { requireSession } from "@/server/auth/session";
import { AgentBottomNav } from "@/components/agent-nav";
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
    <div className="flex min-h-full flex-1 flex-col bg-zinc-50">
      <main className="flex-1 px-6 py-6 pb-24">
        {children}
        <form action={logoutAction} className="mx-auto mt-8 w-full max-w-md text-center">
          <button type="submit" className="text-sm text-zinc-500 underline">
            Déconnexion
          </button>
        </form>
      </main>
      <AgentBottomNav />
    </div>
  );
}
