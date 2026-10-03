"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import type { ReactNode } from "react";
import { Logo } from "./logo";

export type NavGroup = {
  label: string;
  items: { href: string; label: string; icon: ReactNode }[];
};

// Aplat marine de la charte : l'identité DL Propreté au premier coup d'œil.
// Contrastes calculés sur #243746 : blanc 12,3:1, blanc/80 ≈ 8,5:1,
// blanc/60 ≈ 5,6:1 (AA texte courant).
export function Sidebar({
  groups,
  logoutAction,
}: {
  groups: NavGroup[];
  logoutAction: () => void | Promise<void>;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="flex items-center justify-between bg-brand-700 px-4 py-3 lg:hidden">
        <Logo tone="blanc" />
        <button
          type="button"
          aria-label="Ouvrir le menu"
          onClick={() => setOpen(true)}
          className="rounded p-1.5 text-white hover:bg-white/10 focus-visible:outline-white"
        >
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>

      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/30 lg:hidden"
          onClick={() => setOpen(false)}
          aria-hidden
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 -translate-x-full flex-col bg-brand-700 transition-transform lg:sticky lg:top-0 lg:bottom-auto lg:z-auto lg:h-screen lg:translate-x-0 ${
          open ? "translate-x-0" : ""
        }`}
      >
        <div className="hidden px-4 py-4 lg:block">
          <Logo tone="blanc" />
        </div>
        <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-4">
          {groups.map((group) => (
            <div key={group.label}>
              <h2 className="px-2 text-xs font-semibold uppercase tracking-wide text-white/60">
                {group.label}
              </h2>
              <ul className="mt-1 space-y-0.5">
                {group.items.map((item) => {
                  const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={() => setOpen(false)}
                        className={`flex items-center gap-2.5 rounded px-2 py-1.5 text-sm font-medium focus-visible:outline-white ${
                          active
                            ? "bg-white/15 text-white"
                            : "text-white/80 hover:bg-white/10 hover:text-white"
                        }`}
                      >
                        {item.icon}
                        {item.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>
        <div className="border-t border-white/15 px-3 pt-3">
          <Link
            href="/display"
            onClick={() => setOpen(false)}
            className="block w-full rounded px-2 py-1.5 text-left text-sm text-white/80 hover:bg-white/10 hover:text-white focus-visible:outline-white"
          >
            Mon affichage
          </Link>
          <Link
            href="/compte"
            onClick={() => setOpen(false)}
            className="block w-full rounded px-2 py-1.5 text-left text-sm text-white/80 hover:bg-white/10 hover:text-white focus-visible:outline-white"
          >
            Mon compte
          </Link>
        </div>
        <form action={logoutAction} className="p-3 pt-0.5">
          <button
            type="submit"
            className="w-full rounded px-2 py-1.5 text-left text-sm text-white/80 hover:bg-white/10 hover:text-white focus-visible:outline-white"
          >
            Déconnexion
          </button>
        </form>
      </aside>
    </>
  );
}
