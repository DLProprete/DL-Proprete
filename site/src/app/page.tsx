import Link from "next/link";
import { Container } from "@/components/container";
import { business, services } from "@/lib/business";

const WHY_US = [
  {
    title: "Entreprise locale, depuis 2011",
    text: "Plus de 15 ans d'activité dans le Calvados : une équipe qui connaît le terrain et ses contraintes.",
  },
  {
    title: "Un interlocuteur unique",
    text: "Du devis à l'intervention, vous suivez votre prestation avec le même contact — pas de standard anonyme.",
  },
  {
    title: "Prestations sur-mesure",
    text: "Fréquence, horaires, périmètre : chaque contrat est ajusté à votre activité, pas l'inverse.",
  },
];

export default function HomePage() {
  return (
    <>
      <section className="border-b border-black/5 bg-brand text-white">
        <Container className="grid gap-10 py-20 md:grid-cols-2 md:items-center md:py-28">
          <div className="space-y-6">
            <p className="text-sm font-semibold uppercase tracking-wide text-accent">
              Nettoyage professionnel · {business.serviceArea.join(" & ")}
            </p>
            <h1 className="text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
              Des locaux impeccables, une entreprise de confiance depuis 2011.
            </h1>
            <p className="max-w-lg text-white/75">
              DL Propreté accompagne entreprises, copropriétés et commerces du
              Calvados : nettoyage industriel et tertiaire, fourniture de
              produits d&apos;entretien, manutention et petits dépannages de
              maintenance.
            </p>
            <div className="flex flex-wrap gap-4 pt-2">
              <Link
                href={`mailto:${business.email}?subject=${encodeURIComponent("Demande de devis — DL Propreté")}`}
                className="rounded-full bg-accent px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-accent-dark"
              >
                Demander un devis
              </Link>
              <Link
                href="/services"
                className="rounded-full border border-white/30 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/10"
              >
                Découvrir nos services
              </Link>
            </div>
          </div>
          <dl className="grid grid-cols-2 gap-6 rounded-2xl bg-white/5 p-8">
            <div>
              <dt className="text-sm text-white/60">Activité</dt>
              <dd className="mt-1 text-2xl font-bold">15+ ans</dd>
            </div>
            <div>
              <dt className="text-sm text-white/60">Zone couverte</dt>
              <dd className="mt-1 text-2xl font-bold">Calvados</dd>
            </div>
            <div>
              <dt className="text-sm text-white/60">Basée à</dt>
              <dd className="mt-1 text-2xl font-bold">Colombelles</dd>
            </div>
            <div>
              <dt className="text-sm text-white/60">Domaines</dt>
              <dd className="mt-1 text-2xl font-bold">4 métiers</dd>
            </div>
          </dl>
        </Container>
      </section>

      <section className="py-20">
        <Container>
          <div className="max-w-2xl">
            <h2 className="text-3xl font-bold tracking-tight text-brand">
              Nos domaines d&apos;intervention
            </h2>
            <p className="mt-3 text-foreground/60">
              Une offre complète pour l&apos;entretien de vos locaux, du nettoyage
              quotidien aux interventions ponctuelles.
            </p>
          </div>
          <div className="mt-10 grid gap-6 sm:grid-cols-2">
            {services.map((service) => (
              <div
                key={service.slug}
                className="rounded-2xl border border-black/5 bg-surface-muted p-7"
              >
                <h3 className="text-lg font-semibold text-brand">
                  {service.title}
                </h3>
                <p className="mt-2 text-sm text-foreground/60">
                  {service.summary}
                </p>
              </div>
            ))}
          </div>
          <Link
            href="/services"
            className="mt-8 inline-block text-sm font-semibold text-accent hover:text-accent-dark"
          >
            Voir le détail de nos services →
          </Link>
        </Container>
      </section>

      <section className="border-y border-black/5 bg-surface-muted py-20">
        <Container>
          <h2 className="text-3xl font-bold tracking-tight text-brand">
            Pourquoi DL Propreté
          </h2>
          <div className="mt-10 grid gap-8 md:grid-cols-3">
            {WHY_US.map((item) => (
              <div key={item.title}>
                <h3 className="font-semibold text-brand">{item.title}</h3>
                <p className="mt-2 text-sm text-foreground/60">{item.text}</p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      <section className="py-20">
        <Container className="flex flex-col items-start justify-between gap-8 rounded-2xl bg-brand px-10 py-14 text-white md:flex-row md:items-center">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">
              Un projet de nettoyage à nous confier ?
            </h2>
            <p className="mt-2 max-w-md text-white/70">
              Décrivez-nous vos locaux et vos besoins, nous revenons vers vous
              avec une proposition adaptée.
            </p>
          </div>
          <Link
            href="/contact"
            className="shrink-0 rounded-full bg-accent px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-accent-dark"
          >
            Nous contacter
          </Link>
        </Container>
      </section>
    </>
  );
}
