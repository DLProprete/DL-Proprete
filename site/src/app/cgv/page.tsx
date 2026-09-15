import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/container";
import { business } from "@/lib/business";

export const metadata: Metadata = {
  title: "Conditions générales de vente",
  robots: { index: false, follow: true },
  alternates: { canonical: "/cgv" },
};

export default function CgvPage() {
  return (
    <section className="py-16">
      <Container className="max-w-2xl">
        <h1 className="text-3xl font-bold tracking-tight text-brand">
          Conditions générales de vente
        </h1>
        <p className="mt-3 text-sm text-foreground/50">
          Applicables aux prestations conclues entre professionnels par{" "}
          {business.name}, {business.legalForm}.
        </p>

        <h2 className="mt-8 text-lg font-semibold text-brand">1. Objet et champ d&apos;application</h2>
        <p className="mt-3 leading-relaxed text-foreground/70">
          Les présentes conditions régissent les prestations de nettoyage
          industriel et tertiaire, de négoce de produits d&apos;entretien, de
          manutention et de petits dépannages de maintenance réalisées par{" "}
          {business.name} pour le compte de ses clients professionnels. Toute
          commande implique l&apos;acceptation pleine et entière des présentes
          conditions, qui prévalent sur tout document du client sauf accord
          écrit contraire.
        </p>

        <h2 className="mt-8 text-lg font-semibold text-brand">2. Devis et commande</h2>
        <p className="mt-3 leading-relaxed text-foreground/70">
          Toute prestation fait l&apos;objet d&apos;un devis détaillant le
          périmètre, la fréquence et le tarif. Le devis est valable 30 jours
          à compter de son émission. La commande est réputée ferme à
          réception de son acceptation écrite (signature, bon pour accord ou
          validation électronique) par le client.
        </p>

        <h2 className="mt-8 text-lg font-semibold text-brand">3. Durée et reconduction</h2>
        <p className="mt-3 leading-relaxed text-foreground/70">
          Les contrats de prestations récurrentes sont conclus pour une durée
          initiale de 12 mois. Sauf dénonciation par l&apos;une des parties
          par écrit avant l&apos;échéance, dans le délai de préavis indiqué au
          contrat, celui-ci se renouvelle par tacite reconduction pour une
          durée identique.
        </p>

        <h2 className="mt-8 text-lg font-semibold text-brand">4. Modalités d&apos;exécution</h2>
        <p className="mt-3 leading-relaxed text-foreground/70">
          Les prestations sont exécutées selon les jours, horaires et
          fréquences définis au contrat. {business.name} affecte le personnel
          nécessaire à la bonne exécution des prestations commandées et peut
          procéder à un remplacement en cas d&apos;absence, sans que cela
          n&apos;affecte le volume ni le tarif convenus.
        </p>

        <h2 className="mt-8 text-lg font-semibold text-brand">5. Prix et facturation</h2>
        <p className="mt-3 leading-relaxed text-foreground/70">
          Les prix sont exprimés en euros hors taxes, la TVA étant appliquée
          au taux en vigueur. Sauf stipulation contraire du contrat, la
          facturation est mensuelle et calculée sur la base des heures
          prévues au contrat, indépendamment des heures réellement
          constatées sur le terrain. Les interventions ponctuelles hors
          contrat sont facturées séparément, sur devis ou au tarif horaire en
          vigueur.
        </p>

        <h2 className="mt-8 text-lg font-semibold text-brand">6. Modalités de paiement</h2>
        <p className="mt-3 leading-relaxed text-foreground/70">
          Sauf délai différent indiqué sur la facture, le règlement intervient
          à 30 jours à compter de la date d&apos;émission de la facture, par
          virement bancaire. Aucun escompte n&apos;est accordé pour paiement
          anticipé.
        </p>

        <h2 className="mt-8 text-lg font-semibold text-brand">7. Retard de paiement</h2>
        <p className="mt-3 leading-relaxed text-foreground/70">
          Conformément à l&apos;article L441-10 du code de commerce, tout
          retard de paiement entraîne de plein droit, sans mise en demeure
          préalable, l&apos;application d&apos;une pénalité calculée sur la
          base du taux indiqué sur la facture, ainsi qu&apos;une indemnité
          forfaitaire pour frais de recouvrement de 40 €. Une indemnité
          complémentaire pourra être demandée sur justificatif si les frais
          de recouvrement exposés dépassent ce montant.
        </p>

        <h2 className="mt-8 text-lg font-semibold text-brand">8. Réclamations</h2>
        <p className="mt-3 leading-relaxed text-foreground/70">
          Toute réclamation relative à l&apos;exécution d&apos;une prestation
          doit être adressée par écrit à {business.email} dans les meilleurs
          délais suivant sa constatation, en précisant le site et la date
          concernés, afin de permettre une intervention corrective rapide.
        </p>

        <h2 className="mt-8 text-lg font-semibold text-brand">9. Résiliation</h2>
        <p className="mt-3 leading-relaxed text-foreground/70">
          En cas de manquement grave de l&apos;une des parties à ses
          obligations, non corrigé dans un délai de 30 jours après mise en
          demeure écrite restée sans effet, l&apos;autre partie pourra
          résilier le contrat de plein droit, sans préjudice de tous
          dommages et intérêts qui pourraient être réclamés.
        </p>

        <h2 className="mt-8 text-lg font-semibold text-brand">10. Responsabilité et assurance</h2>
        <p className="mt-3 leading-relaxed text-foreground/70">
          {business.name} est couverte par une assurance responsabilité
          civile professionnelle pour les dommages directement imputables à
          l&apos;exécution de ses prestations. Sa responsabilité ne saurait
          être engagée en cas de force majeure ou de fait d&apos;un tiers.
        </p>

        <h2 className="mt-8 text-lg font-semibold text-brand">11. Données personnelles</h2>
        <p className="mt-3 leading-relaxed text-foreground/70">
          Les données transmises dans le cadre de la relation commerciale
          sont traitées conformément à notre{" "}
          <Link href="/politique-confidentialite" className="text-accent-dark hover:text-accent-darker">
            politique de confidentialité
          </Link>
          .
        </p>

        <h2 className="mt-8 text-lg font-semibold text-brand">12. Droit applicable et litiges</h2>
        <p className="mt-3 leading-relaxed text-foreground/70">
          Les présentes conditions sont soumises au droit français. À défaut
          de résolution amiable, tout litige relatif à leur interprétation ou
          leur exécution relève de la compétence exclusive des tribunaux du
          ressort de Caen ({business.rcs}).
        </p>
      </Container>
    </section>
  );
}
