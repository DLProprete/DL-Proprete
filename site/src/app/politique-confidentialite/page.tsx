import type { Metadata } from "next";
import { Container } from "@/components/container";
import { business } from "@/lib/business";

export const metadata: Metadata = {
  title: "Politique de confidentialité",
  description: "Comment DL Propreté collecte, utilise et protège vos données personnelles.",
  alternates: { canonical: "/politique-confidentialite" },
};

export default function PolitiqueConfidentialitePage() {
  return (
    <section className="py-16">
      <Container className="max-w-2xl">
        <h1 className="text-3xl font-bold tracking-tight text-brand">
          Politique de confidentialité
        </h1>

        <h2 className="mt-8 text-lg font-semibold text-brand">Responsable du traitement</h2>
        <p className="mt-3 leading-relaxed text-foreground/70">
          {business.name}, {business.legalForm}, {business.address.street},{" "}
          {business.address.postalCode} {business.address.city} — SIREN {business.siren}.
          Contact : {business.email}.
        </p>

        <h2 className="mt-8 text-lg font-semibold text-brand">Données collectées</h2>
        <p className="mt-3 leading-relaxed text-foreground/70">
          Via le formulaire de contact et de demande de devis : nom, société le cas échéant,
          e-mail, téléphone le cas échéant, commune, et les informations que vous nous
          transmettez librement dans votre message.
        </p>

        <h2 className="mt-8 text-lg font-semibold text-brand">Finalité et base légale</h2>
        <p className="mt-3 leading-relaxed text-foreground/70">
          Ces données servent uniquement à répondre à votre demande de devis ou de contact
          (mesures précontractuelles prises à votre demande). Elles ne sont ni revendues, ni
          cédées, ni utilisées à des fins de prospection sans votre accord.
        </p>

        <h2 className="mt-8 text-lg font-semibold text-brand">Destinataires</h2>
        <p className="mt-3 leading-relaxed text-foreground/70">
          Les données sont reçues par {business.name} exclusivement. L&apos;envoi et
          l&apos;hébergement techniques du formulaire sont assurés par nos prestataires
          d&apos;hébergement et de messagerie, en tant que sous-traitants, sans accès à
          d&apos;autres finalités.
        </p>

        <h2 className="mt-8 text-lg font-semibold text-brand">Durée de conservation</h2>
        <p className="mt-3 leading-relaxed text-foreground/70">
          Les demandes sans suite commerciale sont conservées 3 ans maximum à compter du
          dernier contact, conformément aux recommandations de la CNIL. En cas de contrat, les
          données sont conservées pour la durée de la relation commerciale et les obligations
          légales de conservation qui suivent.
        </p>

        <h2 className="mt-8 text-lg font-semibold text-brand">Vos droits</h2>
        <p className="mt-3 leading-relaxed text-foreground/70">
          Conformément au RGPD, vous disposez d&apos;un droit d&apos;accès, de rectification,
          d&apos;effacement et d&apos;opposition sur vos données. Pour l&apos;exercer, écrivez à{" "}
          <a href={`mailto:${business.email}`} className="text-accent hover:text-accent-dark">
            {business.email}
          </a>
          . Vous pouvez aussi introduire une réclamation auprès de la CNIL (
          <a
            href="https://www.cnil.fr"
            className="text-accent hover:text-accent-dark"
            target="_blank"
            rel="noopener noreferrer"
          >
            cnil.fr
          </a>
          ).
        </p>

        <h2 className="mt-8 text-lg font-semibold text-brand">Cookies et mesure d&apos;audience</h2>
        <p className="mt-3 leading-relaxed text-foreground/70">
          Ce site utilise Vercel Web Analytics, un outil de mesure d&apos;audience qui ne dépose
          aucun cookie et ne collecte aucune donnée personnelle identifiable : aucun consentement
          n&apos;est donc requis.
        </p>
      </Container>
    </section>
  );
}
