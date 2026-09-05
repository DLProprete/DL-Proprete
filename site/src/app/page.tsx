import Link from "next/link";
import { Container } from "@/components/container";
import { business, services } from "@/lib/business";
import {
  ArrowRightIcon,
  BottleIcon,
  BuildingIcon,
  CalendarCheckIcon,
  CheckIcon,
  FactoryIcon,
  MessageIcon,
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
  { label: "Zone couverte", value: "Calvados", href: "/zone-intervention" },
  { label: "Basée à", value: "Colombelles", href: "/contact" },
  { label: "Domaines", value: "4 métiers", href: "/services" },
];

const STEPS = [
  {
    icon: MessageIcon,
    title: "Vous décrivez vos locaux",
    text: "Surface, fréquence souhaitée, contraintes d'accès : quelques lignes suffisent pour démarrer.",
  },
  {
    icon: SparkleIcon,
    title: "On intervient",
    text: "Une équipe formée, du matériel professionnel, un périmètre défini avec vous à l'avance.",
  },
  {
    icon: CalendarCheckIcon,
    title: "On suit dans la durée",
    text: "Même contact, même exigence à chaque passage — pas un prestataire différent à chaque fois.",
  },
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
      <section className="relative overflow-hidden bg-white">
        <div
          className="pointer-events-none absolute -left-32 -top-32 h-[28rem] w-[28rem] rounded-full bg-accent/15 blur-3xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -right-24 top-40 h-80 w-80 rounded-full bg-brand/10 blur-3xl"
          aria-hidden
        />
        <svg
          className="pointer-events-none absolute inset-0 h-full w-full text-brand/[0.05]"
          aria-hidden
        >
          <pattern id="grid-dots" width="26" height="26" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1.4" fill="currentColor" />
          </pattern>
          <rect width="100%" height="100%" fill="url(#grid-dots)" />
        </svg>

        <Container className="relative grid gap-10 py-20 md:grid-cols-2 md:items-center md:py-28">
          <div className="animate-fade-up space-y-6">
            <p className="inline-flex items-center gap-2 rounded-full bg-accent/10 px-4 py-1.5 text-sm font-semibold text-accent-dark">
              <SparkleIcon className="h-4 w-4" />
              Nettoyage professionnel · {business.serviceArea.join(" & ")}
            </p>
            <h1 className="text-4xl font-bold leading-[1.1] tracking-tight text-brand sm:text-5xl">
              On s&apos;occupe de vos locaux, vous vous occupez du reste.
            </h1>
            <p className="max-w-lg text-foreground/60">
              Nettoyage industriel et tertiaire, produits d&apos;entretien,
              manutention et petits dépannages : une seule entreprise pour
              tout gérer, dans le Calvados depuis 2011.
            </p>
            <div className="flex flex-wrap gap-4 pt-2">
              <Link
                href={`mailto:${business.email}?subject=${encodeURIComponent("Demande de devis — DL Propreté")}`}
                className="rounded-full bg-accent px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-accent/25 transition-all hover:-translate-y-0.5 hover:bg-accent-dark hover:shadow-xl hover:shadow-accent/30"
              >
                Demander un devis
              </Link>
              <Link
                href="/services"
                className="rounded-full border border-brand/15 px-6 py-3 text-sm font-semibold text-brand transition-colors hover:bg-brand/5"
              >
                Découvrir nos services
              </Link>
            </div>
          </div>

          <dl className="animate-fade-up grid grid-cols-2 gap-3 [animation-delay:150ms]">
            {STATS.map((stat) => {
              const content = (
                <>
                  <dt className="text-sm text-foreground/50">{stat.label}</dt>
                  <dd className="mt-1 text-2xl font-bold text-brand">{stat.value}</dd>
                </>
              );
              const cardClass =
                "rounded-2xl border border-black/5 bg-white p-6 shadow-sm shadow-black/[0.02] transition-all";
              return stat.href ? (
                <Link
                  key={stat.label}
                  href={stat.href}
                  className={`${cardClass} group hover:-translate-y-0.5 hover:border-accent/30 hover:shadow-md`}
                >
                  {content}
                  <ArrowRightIcon className="mt-2 h-3.5 w-3.5 text-accent opacity-0 transition-opacity group-hover:opacity-100" />
                </Link>
              ) : (
                <div key={stat.label} className={cardClass}>
                  {content}
                </div>
              );
            })}
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
                  className="group rounded-2xl border border-black/5 bg-surface-mint p-7 transition-all hover:-translate-y-1 hover:border-accent/30 hover:shadow-lg hover:shadow-black/5"
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
            className="group/link mt-8 inline-flex items-center gap-1.5 text-sm font-semibold text-accent-dark transition-colors hover:text-accent"
          >
            Voir le détail de nos services
            <ArrowRightIcon className="h-4 w-4 transition-transform group-hover/link:translate-x-1" />
          </Link>
        </Container>
      </section>

      <section className="border-y border-black/5 bg-surface-muted py-20">
        <Container>
          <h2 className="text-3xl font-bold tracking-tight text-brand">
            Comment ça se passe
          </h2>
          <div className="relative mt-12 grid gap-10 md:grid-cols-3">
            <div
              className="pointer-events-none absolute left-0 right-0 top-6 hidden h-px bg-gradient-to-r from-transparent via-black/10 to-transparent md:block"
              aria-hidden
            />
            {STEPS.map((step, index) => (
              <div key={step.title} className="relative">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-brand shadow-sm shadow-black/5 ring-1 ring-black/5">
                  <step.icon className="h-5 w-5" />
                </div>
                <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-accent-dark">
                  Étape {index + 1}
                </p>
                <h3 className="mt-1 font-semibold text-brand">{step.title}</h3>
                <p className="mt-1.5 text-sm text-foreground/60">{step.text}</p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      <section className="py-20">
        <Container>
          <h2 className="text-3xl font-bold tracking-tight text-brand">
            Pourquoi DL Propreté
          </h2>
          <div className="mt-10 grid gap-8 md:grid-cols-3">
            {WHY_US.map((item) => (
              <div key={item.title} className="flex gap-3">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent/15 text-accent-dark">
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

      <section className="pb-20">
        <Container className="relative flex flex-col items-start justify-between gap-8 overflow-hidden rounded-2xl border border-accent/15 bg-surface-mint px-10 py-14 md:flex-row md:items-center">
          <div
            className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-accent/15 blur-3xl"
            aria-hidden
          />
          <div className="relative">
            <h2 className="text-2xl font-bold tracking-tight text-brand">
              Discutons de votre projet
            </h2>
            <p className="mt-2 max-w-md text-foreground/60">
              Décrivez-nous vos locaux, on vous répond avec une proposition
              claire — sans jargon, sans engagement.
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
