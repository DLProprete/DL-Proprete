import Link from "next/link";
import { Container } from "./container";
import { Logo } from "./logo";
import { business } from "@/lib/business";

export function Footer() {
  return (
    <footer className="border-t border-black/5 bg-surface-muted">
      <Container className="grid gap-10 py-14 md:grid-cols-3">
        <div className="space-y-4">
          <Logo />
          <p className="max-w-xs text-sm text-foreground/60">
            Nettoyage industriel et tertiaire, négoce de produits d&apos;entretien,
            manutention et petits dépannages pour les professionnels du{" "}
            {business.serviceArea.join(" et de la ")}.
          </p>
        </div>

        <div className="space-y-3 text-sm">
          <p className="font-semibold text-brand">Navigation</p>
          <nav className="flex flex-col gap-2 text-foreground/70">
            <Link href="/services" className="hover:text-brand">
              Services
            </Link>
            <Link href="/zone-intervention" className="hover:text-brand">
              Zone d&apos;intervention
            </Link>
            <Link href="/contact" className="hover:text-brand">
              Contact
            </Link>
            <Link href="/mentions-legales" className="hover:text-brand">
              Mentions légales
            </Link>
          </nav>
        </div>

        <div className="space-y-3 text-sm">
          <p className="font-semibold text-brand">Coordonnées</p>
          <address className="flex flex-col gap-2 text-foreground/70 not-italic">
            <span>
              {business.address.street}
              <br />
              {business.address.postalCode} {business.address.city}
            </span>
            <a href={`mailto:${business.email}`} className="hover:text-brand">
              {business.email}
            </a>
            {business.phone && (
              <a href={`tel:${business.phone}`} className="hover:text-brand">
                {business.phone}
              </a>
            )}
          </address>
        </div>
      </Container>

      <div className="border-t border-black/5 py-5">
        <Container className="flex flex-col gap-2 text-xs text-foreground/50 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} {business.name} — SIREN {business.siren}
          </p>
          <Link href="/mentions-legales" className="hover:text-brand">
            Mentions légales
          </Link>
        </Container>
      </div>
    </footer>
  );
}
