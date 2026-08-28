import { redirect } from "next/navigation";
import { requireSession } from "@/server/auth/session";

export default async function Home() {
  const user = await requireSession().catch(() => null);

  if (!user) {
    redirect("/login");
  }
  if (user.role === "ADMIN" || user.role === "PLANNER") {
    redirect("/clients");
  }

  return (
    <div className="flex flex-1 items-center justify-center">
      <p className="text-zinc-600">Aucune page pour votre rôle pour l&apos;instant.</p>
    </div>
  );
}
