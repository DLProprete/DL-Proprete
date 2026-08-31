import { redirect } from "next/navigation";
import { requireSession } from "@/server/auth/session";
import { Sidebar, type NavGroup } from "@/components/sidebar";
import { logoutAction } from "../actions";

// Groupes et gates de rôle : reprend exactement les droits de l'ancienne
// barre horizontale (aucun changement d'accès), juste regroupés par thème.
const NAV_GROUPS: { label: string; items: { href: string; label: string; adminOnly?: boolean }[] }[] = [
  {
    label: "Exploitation",
    items: [
      { href: "/dashboard", label: "Tableau de bord", adminOnly: true },
      { href: "/planning", label: "Planning" },
      { href: "/time-entries", label: "Pointages" },
      { href: "/absence-review", label: "Absences", adminOnly: true },
    ],
  },
  {
    label: "Commercial",
    items: [
      { href: "/clients", label: "Clients" },
      { href: "/sites", label: "Sites" },
      { href: "/contracts", label: "Contrats" },
      { href: "/invoices", label: "Factures", adminOnly: true },
    ],
  },
  {
    label: "RH",
    items: [{ href: "/team", label: "Équipe", adminOnly: true }],
  },
  {
    label: "Pilotage",
    items: [
      { href: "/audit", label: "Audit", adminOnly: true },
      { href: "/settings", label: "Paramètres", adminOnly: true },
    ],
  },
];

export default async function BackOfficeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireSession().catch(() => null);
  if (!user || (user.role !== "ADMIN" && user.role !== "PLANNER")) {
    redirect("/login");
  }

  const groups: NavGroup[] = NAV_GROUPS.map((group) => ({
    label: group.label,
    items: group.items
      .filter((item) => !item.adminOnly || user.role === "ADMIN")
      .map(({ href, label }) => ({ href, label })),
  })).filter((group) => group.items.length > 0);

  return (
    <div className="flex min-h-full flex-1 flex-col bg-zinc-50 lg:flex-row">
      <Sidebar groups={groups} logoutAction={logoutAction} />
      <main className="flex-1 px-6 py-6">{children}</main>
    </div>
  );
}
