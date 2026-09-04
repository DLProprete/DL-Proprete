import type { Metadata } from "next";
import { Container } from "@/components/container";
import { business, site } from "@/lib/business";

export const metadata: Metadata = {
  title: "Mentions légales",
  robots: { index: false, follow: true },
  alternates: { canonical: "/mentions-legales" },
};

export default function MentionsLegalesPage() {
  return (
    <section className="py-16">
      <Container className="max-w-2xl">
        <h1 className="text-3xl font-bold tracking-tight text-brand">
          Mentions légales
        </h1>

        <h2 className="mt-8 text-lg font-semibold text-brand">Éditeur du site</h2>
        <p className="mt-3 leading-relaxed text-foreground/70">
          {business.name}
          <br />
          Forme juridique et capital social : à compléter
          <br />
          Siège social : {business.address.street}, {business.address.postalCode}{" "}
          {business.address.city}
          <br />
          SIREN : {business.siren}
          <br />
          Immatriculée depuis {business.foundedLabel}
          <br />
          E-mail : {business.email}
          <br />
          Directeur de la publication : à compléter
        </p>

        <h2 className="mt-8 text-lg font-semibold text-brand">Hébergement</h2>
        <p className="mt-3 leading-relaxed text-foreground/70">
          Vercel Inc., 440 N Barranca Ave #4133, Covina, CA 91723, États-Unis —{" "}
          <a href="https://vercel.com" className="text-accent hover:text-accent-dark">
            vercel.com
          </a>
        </p>

        <h2 className="mt-8 text-lg font-semibold text-brand">
          Propriété intellectuelle
        </h2>
        <p className="mt-3 leading-relaxed text-foreground/70">
          L&apos;ensemble des contenus présents sur {site.url.replace("https://", "")}{" "}
          (textes, logo, mise en page) est la propriété de {business.name}, sauf
          mention contraire. Toute reproduction sans autorisation est interdite.
        </p>

        <h2 className="mt-8 text-lg font-semibold text-brand">
          Données personnelles
        </h2>
        <p className="mt-3 leading-relaxed text-foreground/70">
          Les informations transmises via ce site (formulaire, e-mail) sont
          utilisées exclusivement pour répondre à votre demande de contact ou de
          devis et ne sont ni cédées ni exploitées à d&apos;autres fins.
        </p>
      </Container>
    </section>
  );
}
