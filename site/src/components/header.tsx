"use client";

import { useState } from "react";
import Link from "next/link";
import { Container } from "./container";
import { Logo } from "./logo";
import { business } from "@/lib/business";

const NAV_LINKS = [
  { href: "/services", label: "Services" },
  { href: "/zone-intervention", label: "Zone d'intervention" },
  { href: "/contact", label: "Contact" },
];

const DEVIS_HREF = `mailto:${business.email}?subject=${encodeURIComponent("Demande de devis — DL Propreté")}`;

export function Header() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 border-b border-black/5 bg-background/90 backdrop-blur">
      <Container className="flex h-18 items-center justify-between py-3">
        <Link href="/" aria-label="DL Propreté — accueil" onClick={() => setOpen(false)}>
          <Logo />
        </Link>
        <nav className="hidden items-center gap-8 md:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-foreground/70 transition-colors hover:text-brand"
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <Link
            href={DEVIS_HREF}
            className="hidden rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-white shadow-sm shadow-accent/20 transition-all hover:-translate-y-0.5 hover:bg-accent-dark hover:shadow-md hover:shadow-accent/25 sm:inline-block"
          >
            Demander un devis
          </Link>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-label={open ? "Fermer le menu" : "Ouvrir le menu"}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-black/10 text-brand md:hidden"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              className="h-5 w-5"
            >
              {open ? (
                <path d="M6 6l12 12M18 6L6 18" />
              ) : (
                <path d="M4 7h16M4 12h16M4 17h16" />
              )}
            </svg>
          </button>
        </div>
      </Container>

      {open && (
        <div className="border-t border-black/5 md:hidden">
          <Container className="flex flex-col gap-1 py-4">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="rounded-lg px-2 py-2.5 text-sm font-medium text-foreground/70 hover:bg-surface-muted hover:text-brand"
              >
                {link.label}
              </Link>
            ))}
            <Link
              href={DEVIS_HREF}
              onClick={() => setOpen(false)}
              className="mt-2 rounded-full bg-accent px-5 py-2.5 text-center text-sm font-semibold text-white sm:hidden"
            >
              Demander un devis
            </Link>
          </Container>
        </div>
      )}
    </header>
  );
}
