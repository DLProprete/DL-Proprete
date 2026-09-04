import type { Metadata } from "next";
import { Container } from "@/components/container";
import { business } from "@/lib/business";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Contactez DL Propreté pour une demande de devis de nettoyage professionnel dans le Calvados.",
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  const devisHref = `mailto:${business.email}?subject=${encodeURIComponent(
    "Demande de devis — DL Propreté",
  )}&body=${encodeURIComponent(
    "Bonjour,\n\nJe souhaite obtenir un devis pour :\n- Type de local : \n- Adresse : \n- Fréquence souhaitée : \n\nMerci,\n",
  )}`;

  return (
    <section className="py-16">
      <Container className="grid gap-12 md:grid-cols-2">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-accent">
            Contact
          </p>
          <h1 className="mt-2 text-4xl font-bold tracking-tight text-brand">
            Parlons de votre projet
          </h1>
          <p className="mt-4 max-w-md text-foreground/60">
            Décrivez-nous votre local et vos besoins par e-mail, nous revenons
            vers vous avec une proposition adaptée.
          </p>
          <a
            href={devisHref}
            className="mt-8 inline-block rounded-full bg-accent px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-accent-dark"
          >
            Écrire pour un devis
          </a>
        </div>

        <div className="space-y-6 rounded-2xl border border-black/5 bg-surface-muted p-8">
          <div>
            <p className="text-sm font-semibold text-brand">Adresse</p>
            <address className="mt-1 not-italic text-foreground/60">
              {business.address.street}
              <br />
              {business.address.postalCode} {business.address.city}
            </address>
          </div>
          <div>
            <p className="text-sm font-semibold text-brand">E-mail</p>
            <a
              href={`mailto:${business.email}`}
              className="mt-1 block text-foreground/60 hover:text-brand"
            >
              {business.email}
            </a>
          </div>
          <div>
            <p className="text-sm font-semibold text-brand">Téléphone</p>
            {business.phone ? (
              <a
                href={`tel:${business.phone}`}
                className="mt-1 block text-foreground/60 hover:text-brand"
              >
                {business.phone}
              </a>
            ) : (
              <p className="mt-1 text-foreground/60">
                Nous contacter par e-mail, un numéro sera indiqué prochainement.
              </p>
            )}
          </div>
          <div>
            <p className="text-sm font-semibold text-brand">
              Zone d&apos;intervention
            </p>
            <p className="mt-1 text-foreground/60">
              {business.serviceArea.join(" · ")}
            </p>
          </div>
        </div>
      </Container>
    </section>
  );
}
