import Link from "next/link";
import { Container } from "@/components/container";
import { business, services } from "@/lib/business";
import {
  ArrowRightIcon,
  BottleIcon,
  BuildingIcon,
  CheckIcon,
  FactoryIcon,
  SparkleIcon,
  ToolboxIcon,
} from "@/components/icons";

const SERVICE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  "nettoyage-industriel": FactoryIcon,
  "nettoyage-batiments": BuildingIcon,
  "negoce-produits-entretien": BottleIcon,
  "manutention-depannages": ToolboxIcon,
};

const STATS = [
  { label: "Activité", value: "15+ ans" },
  { label: "Zone couverte", value: "Calvados" },
  { label: "Basée à", value: "Colombelles" },
  { label: "Domaines", value: "4 métiers" },
];

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
      <section className="relative overflow-hidden border-b border-black/5 bg-brand text-white">
        <svg
          className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.08]"
          aria-hidden
        >
          <pattern id="grid-dots" width="28" height="28" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1.4" fill="currentColor" />
          </pattern>
          <rect width="100%" height="100%" fill="url(#grid-dots)" />
        </svg>
        <div
          className="pointer-events-none absolute -right-40 -top-40 h-96 w-96 rounded-full bg-accent/20 blur-3xl"
          aria-hidden
        />

        <Container className="relative grid gap-10 py-20 md:grid-cols-2 md:items-center md:py-28">
          <div className="animate-fade-up space-y-6">
            <p className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-sm font-semibold text-accent">
              <SparkleIcon className="h-4 w-4" />
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
                className="rounded-full bg-accent px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-accent/20 transition-all hover:-translate-y-0.5 hover:bg-accent-dark hover:shadow-xl hover:shadow-accent/30"
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

          <dl className="animate-fade-up grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/10 [animation-delay:150ms]">
            {STATS.map((stat) => (
              <div key={stat.label} className="bg-brand-dark/60 p-7">
                <dt className="text-sm text-white/60">{stat.label}</dt>
                <dd className="mt-1 text-2xl font-bold">{stat.value}</dd>
              </div>
            ))}
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
            {services.map((service) => {
              const Icon = SERVICE_ICONS[service.slug];
              return (
                <div
                  key={service.slug}
                  className="group rounded-2xl border border-black/5 bg-surface-muted p-7 transition-all hover:-translate-y-1 hover:border-accent/30 hover:shadow-lg hover:shadow-black/5"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand text-white transition-colors group-hover:bg-accent">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-4 text-lg font-semibold text-brand">
                    {service.title}
                  </h3>
                  <p className="mt-2 text-sm text-foreground/60">
                    {service.summary}
                  </p>
                </div>
              );
            })}
          </div>
          <Link
            href="/services"
            className="group/link mt-8 inline-flex items-center gap-1.5 text-sm font-semibold text-accent transition-colors hover:text-accent-dark"
          >
            Voir le détail de nos services
            <ArrowRightIcon className="h-4 w-4 transition-transform group-hover/link:translate-x-1" />
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
              <div key={item.title} className="flex gap-3">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent/15 text-accent">
                  <CheckIcon className="h-3.5 w-3.5" />
                </span>
                <div>
                  <h3 className="font-semibold text-brand">{item.title}</h3>
                  <p className="mt-1.5 text-sm text-foreground/60">{item.text}</p>
                </div>
              </div>
            ))}
          </div>
        </Container>
      </section>

      <section className="py-20">
        <Container className="relative flex flex-col items-start justify-between gap-8 overflow-hidden rounded-2xl bg-brand px-10 py-14 text-white md:flex-row md:items-center">
          <div
            className="pointer-events-none absolute -left-24 -bottom-24 h-72 w-72 rounded-full bg-accent/15 blur-3xl"
            aria-hidden
          />
          <div className="relative">
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
            className="relative shrink-0 rounded-full bg-accent px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-accent/20 transition-all hover:-translate-y-0.5 hover:bg-accent-dark"
          >
            Nous contacter
          </Link>
        </Container>
      </section>
    </>
  );
}
