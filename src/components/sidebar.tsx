"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

export type NavGroup = {
  label: string;
  items: { href: string; label: string }[];
};

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
      <div className="flex items-center justify-between border-b border-zinc-200 bg-white px-4 py-3 lg:hidden">
        <span className="text-sm font-semibold text-zinc-900">DL Propreté</span>
        <button
          type="button"
          aria-label="Ouvrir le menu"
          onClick={() => setOpen(true)}
          className="rounded p-1.5 text-zinc-600 hover:bg-zinc-100"
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
        className={`fixed inset-y-0 left-0 z-40 flex w-64 -translate-x-full flex-col border-r border-zinc-200 bg-white transition-transform lg:static lg:z-auto lg:translate-x-0 ${
          open ? "translate-x-0" : ""
        }`}
      >
        <div className="hidden px-4 py-4 text-sm font-semibold text-zinc-900 lg:block">
          DL Propreté
        </div>
        <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-4">
          {groups.map((group) => (
            <div key={group.label}>
              <h2 className="px-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
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
                        className={`block rounded px-2 py-1.5 text-sm font-medium ${
                          active
                            ? "bg-brand-50 text-brand-700"
                            : "text-zinc-700 hover:bg-zinc-100"
                        }`}
                      >
                        {item.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>
        <form action={logoutAction} className="border-t border-zinc-200 p-3">
          <button
            type="submit"
            className="w-full rounded px-2 py-1.5 text-left text-sm text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
          >
            Déconnexion
          </button>
        </form>
      </aside>
    </>
  );
}
