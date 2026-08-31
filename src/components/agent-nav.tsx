"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sun, CalendarOff, Clock } from "lucide-react";

const ITEMS = [
  { href: "/today", label: "Aujourd'hui", icon: Sun },
  { href: "/absences", label: "Absences", icon: CalendarOff },
  { href: "/hours", label: "Mes heures", icon: Clock },
];

// Déconnexion volontairement absente de cette barre : un tiers (puis un
// quart) de la barre de navigation principale exposait à une déconnexion
// accidentelle, avec ressaisie d'e-mail/mot de passe dehors. Déplacée en
// lien discret sous le contenu — voir AgentLayout.
export function AgentBottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 flex divide-x divide-zinc-200 border-t border-zinc-200 bg-white text-sm font-medium">
      {ITEMS.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 px-2 py-2 text-center ${
              active ? "text-brand-700" : "text-zinc-600"
            }`}
          >
            <item.icon size={20} strokeWidth={2} aria-hidden />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
