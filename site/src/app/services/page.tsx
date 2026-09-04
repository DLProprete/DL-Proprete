import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/container";
import { business, services } from "@/lib/business";

export const metadata: Metadata = {
  title: "Services",
  description:
    "Nettoyage industriel, nettoyage des bâtiments, négoce de produits d'entretien, manutention et petits dépannages de maintenance dans le Calvados.",
  alternates: { canonical: "/services" },
};

export default function ServicesPage() {
  return (
    <>
      <section className="border-b border-black/5 bg-surface-muted py-16">
        <Container>
          <p className="text-sm font-semibold uppercase tracking-wide text-accent">
            Nos services
          </p>
          <h1 className="mt-2 text-4xl font-bold tracking-tight text-brand">
            Une offre complète pour l&apos;entretien de vos locaux
          </h1>
          <p className="mt-4 max-w-2xl text-foreground/60">
            DL Propreté intervient sur quatre grands domaines, du nettoyage
            quotidien à l&apos;appui ponctuel en maintenance, pour les
            professionnels du {business.serviceArea.join(" et de la ")}.
          </p>
        </Container>
      </section>

      <section className="py-16">
        <Container className="space-y-10">
          {services.map((service, index) => (
            <div
              key={service.slug}
              id={service.slug}
              className="grid gap-6 border-b border-black/5 pb-10 last:border-0 md:grid-cols-[auto_1fr] md:gap-10"
            >
              <span className="text-sm font-semibold text-accent">
                {String(index + 1).padStart(2, "0")}
              </span>
              <div>
                <h2 className="text-2xl font-semibold text-brand">
                  {service.title}
                </h2>
                <p className="mt-3 max-w-2xl text-foreground/60">
                  {service.summary}
                </p>
              </div>
            </div>
          ))}
        </Container>
      </section>

      <section className="border-t border-black/5 bg-surface-muted py-16">
        <Container className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
          <div>
            <h2 className="text-2xl font-bold text-brand">
              Une demande spécifique ?
            </h2>
            <p className="mt-2 text-foreground/60">
              Parlez-nous de vos locaux, nous vous proposons une prestation
              adaptée.
            </p>
          </div>
          <Link
            href="/contact"
            className="shrink-0 rounded-full bg-accent px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-accent-dark"
          >
            Demander un devis
          </Link>
        </Container>
      </section>
    </>
  );
}
