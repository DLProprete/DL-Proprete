"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/today", label: "Aujourd'hui" },
  { href: "/absences", label: "Absences" },
];

export function AgentBottomNav({ logoutAction }: { logoutAction: () => void | Promise<void> }) {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 flex divide-x divide-zinc-200 border-t border-zinc-200 bg-white text-sm font-medium">
      {ITEMS.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex min-h-14 flex-1 items-center justify-center px-2 py-3 text-center ${
              active ? "text-teal-700" : "text-zinc-600"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
      <form action={logoutAction} className="flex flex-1">
        <button
          type="submit"
          className="min-h-14 flex-1 px-2 py-3 text-center text-zinc-600"
        >
          Déconnexion
        </button>
      </form>
    </nav>
  );
}
