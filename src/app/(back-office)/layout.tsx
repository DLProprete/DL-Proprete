import { redirect } from "next/navigation";
import {
  LayoutDashboard,
  CalendarDays,
  Timer,
  CalendarOff,
  Handshake,
  Building2,
  MapPin,
  FileSignature,
  Receipt,
  Users,
  ScrollText,
  Settings,
  type LucideIcon,
} from "lucide-react";
import { requireSession } from "@/server/auth/session";
import { Sidebar, type NavGroup } from "@/components/sidebar";
import { logoutAction } from "../actions";

// Groupes et gates de rôle : reprend exactement les droits de l'ancienne
// barre horizontale (aucun changement d'accès), juste regroupés par thème.
const NAV_GROUPS: {
  label: string;
  items: { href: string; label: string; icon: LucideIcon; adminOnly?: boolean }[];
}[] = [
  {
    label: "Exploitation",
    items: [
      { href: "/dashboard", label: "Tableau de bord", icon: LayoutDashboard, adminOnly: true },
      { href: "/planning", label: "Planning", icon: CalendarDays },
      { href: "/time-entries", label: "Pointages", icon: Timer },
      { href: "/absence-review", label: "Absences", icon: CalendarOff, adminOnly: true },
    ],
  },
  {
    label: "Commercial",
    items: [
      { href: "/prospects", label: "Prospects", icon: Handshake },
      { href: "/clients", label: "Clients", icon: Building2 },
      { href: "/sites", label: "Sites", icon: MapPin },
      { href: "/contracts", label: "Contrats", icon: FileSignature },
      { href: "/invoices", label: "Factures", icon: Receipt, adminOnly: true },
    ],
  },
  {
    label: "RH",
    items: [{ href: "/team", label: "Équipe", icon: Users, adminOnly: true }],
  },
  {
    label: "Pilotage",
    items: [
      { href: "/audit", label: "Audit", icon: ScrollText, adminOnly: true },
      { href: "/settings", label: "Paramètres", icon: Settings, adminOnly: true },
    ],
  },
];

export default async function BackOfficeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireSession().catch(() => null);
  if (!user) {
    redirect("/login");
  }
  if (user.role !== "ADMIN" && user.role !== "PLANNER") {
    redirect("/unauthorized");
  }

  const groups: NavGroup[] = NAV_GROUPS.map((group) => ({
    label: group.label,
    items: group.items
      .filter((item) => !item.adminOnly || user.role === "ADMIN")
      .map(({ href, label, icon: Icon }) => ({
        href,
        label,
        icon: <Icon size={17} strokeWidth={2} aria-hidden />,
      })),
  })).filter((group) => group.items.length > 0);

  return (
    <div className="flex min-h-full flex-1 flex-col bg-zinc-50 lg:flex-row">
      <Sidebar groups={groups} logoutAction={logoutAction} />
      <main className="flex-1 px-6 py-6">{children}</main>
    </div>
  );
}
