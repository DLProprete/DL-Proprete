import Link from "next/link";
import { Container } from "@/components/container";
import { business, services } from "@/lib/business";
import { cities } from "@/lib/cities";
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
  ZoneIcon,
} from "@/components/icons";

const mapQuery = encodeURIComponent(
  `${business.address.street}, ${business.address.postalCode} ${business.address.city}`,
);

const SERVICE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  "nettoyage-industriel": FactoryIcon,
  "nettoyage-batiments": BuildingIcon,
  "negoce-produits-entretien": BottleIcon,
  "manutention-depannages": ToolboxIcon,
};

const STATS = [
  { label: "Activité", value: "15+ ans" },
  { label: "Zone couverte", value: "Caen et alentours", href: "/zone-intervention" },
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

const FAQS = [
  {
    question: "Dans quelles zones intervenez-vous ?",
    answer:
      "En priorité Caen et son agglomération. Pour un site plus éloigné, contactez-nous : on étudie chaque demande au cas par cas.",
  },
  {
    question: "Peut-on ajuster la fréquence en cours de contrat ?",
    answer:
      "Oui. La fréquence est définie avec vous au démarrage selon l'usage réel des locaux, et peut être revue si vos besoins changent — ce n'est pas figé pour un an.",
  },
  {
    question: "Travaillez-vous avec les copropriétés et les syndics ?",
    answer:
      "Oui, c'est une part importante de notre activité : entretien des parties communes, comptes-rendus réguliers pour les assemblées générales.",
  },
  {
    question: "Fournissez-vous les produits d'entretien ?",
    answer:
      "Oui, c'est l'un de nos quatre métiers : détergents, hygiène, papeterie sanitaire — en complément du nettoyage ou en fourniture seule.",
  },
  {
    question: "Comment obtenir un devis ?",
    answer:
      "Remplissez le formulaire de contact (type de site, surface approximative, fréquence souhaitée) : on revient vers vous sous 72 h ouvrées avec une proposition adaptée, sans engagement.",
  },
];

const WHY_US = [
  {
    title: "Entreprise locale, depuis 2011",
    text: "Plus de 15 ans d'activité à Caen et ses alentours : une équipe qui connaît le terrain et ses contraintes.",
  },
  {
    title: "Le même contact du début à la fin",
    text: "Du devis à l'intervention, vous suivez votre prestation avec le même contact — pas de standard anonyme.",
  },
  {
    title: "Prestations sur-mesure",
    text: "Fréquence, horaires, périmètre : chaque contrat est ajusté à votre activité, pas l'inverse.",
  },
];

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQS.map((faq) => ({
    "@type": "Question",
    name: faq.question,
    acceptedAnswer: { "@type": "Answer", text: faq.answer },
  })),
};

export default function HomePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <section className="border-b border-black/5 bg-surface-muted">
        <Container className="py-20 md:py-28">
          <div className="animate-fade-up max-w-2xl space-y-6">
            <p className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-accent-dark">
              <SparkleIcon className="h-4 w-4" />
              Nettoyage professionnel · {business.serviceArea.join(" & ")}
            </p>
            <h1 className="text-4xl font-bold leading-[1.1] tracking-tight text-brand sm:text-5xl">
              Nettoyage professionnel pour entreprises et copropriétés de Caen et ses alentours.
            </h1>
            <p className="max-w-lg text-foreground/60">
              Nettoyage industriel et tertiaire, produits d&apos;entretien,
              manutention et petits dépannages : une seule entreprise pour
              tout gérer, à Caen et ses alentours depuis 2011.
            </p>
            <div className="flex flex-wrap gap-4 pt-2">
              <Link
                href="/contact"
                className="rounded-lg bg-accent-dark px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-accent-darker"
              >
                Demander un devis
              </Link>
              <Link
                href="/services"
                className="rounded-lg border border-brand/15 px-6 py-3 text-sm font-semibold text-brand transition-colors hover:bg-brand/5"
              >
                Découvrir nos services
              </Link>
            </div>
          </div>

          <dl className="animate-fade-up mt-14 grid grid-cols-2 gap-x-8 gap-y-6 border-t border-black/10 pt-8 sm:grid-cols-4 [animation-delay:150ms]">
            {STATS.map((stat) => {
              const content = (
                <>
                  <dt className="text-xs font-medium uppercase tracking-wide text-foreground/45">
                    {stat.label}
                  </dt>
                  <dd className="mt-1 text-xl font-bold text-brand">{stat.value}</dd>
                </>
              );
              return stat.href ? (
                <Link key={stat.label} href={stat.href} className="group">
                  {content}
                  <span className="mt-1 block text-xs font-medium text-accent-dark opacity-0 transition-opacity group-hover:opacity-100">
                    Voir →
                  </span>
                </Link>
              ) : (
                <div key={stat.label}>{content}</div>
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
                  className="rounded-2xl border border-black/5 bg-surface-mint p-7"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-black/5 bg-white text-brand">
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
            <ArrowRightIcon className="h-4 w-4" />
          </Link>
        </Container>
      </section>

      <section className="border-y border-black/5 bg-surface-muted py-20">
        <Container className="grid gap-10 md:grid-cols-2 md:items-center">
          <div className="overflow-hidden rounded-2xl border border-black/5">
            <iframe
              title="Zone d'intervention de DL Propreté autour de Colombelles"
              src={`https://maps.google.com/maps?q=${mapQuery}&output=embed`}
              className="h-72 w-full md:h-80"
              loading="lazy"
            />
          </div>
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-brand">
              Notre zone d&apos;intervention
            </h2>
            <p className="mt-3 text-foreground/60">
              Basés à Colombelles, nous intervenons à Caen et dans ses
              alentours.
            </p>
            <ul className="mt-6 flex flex-wrap gap-3">
              {cities.map((city) => (
                <li key={city.slug}>
                  <Link
                    href={`/zone-intervention/${city.slug}`}
                    className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-medium text-brand transition-colors hover:border-accent/30"
                  >
                    <ZoneIcon className="h-3.5 w-3.5 text-brand" />
                    {city.name}
                  </Link>
                </li>
              ))}
            </ul>
            <Link
              href="/zone-intervention"
              className="group/link mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-accent-dark transition-colors hover:text-accent"
            >
              Voir toute notre zone d&apos;intervention
              <ArrowRightIcon className="h-4 w-4" />
            </Link>
          </div>
        </Container>
      </section>

      <section className="border-b border-black/5 py-20">
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

      <section className="border-t border-black/5 py-20">
        <Container className="max-w-3xl">
          <h2 className="text-3xl font-bold tracking-tight text-brand">Questions fréquentes</h2>
          <div className="mt-8 divide-y divide-black/5">
            {FAQS.map((faq) => (
              <details key={faq.question} className="group py-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold text-brand marker:content-none">
                  {faq.question}
                  <span className="shrink-0 text-xl text-accent-dark transition-transform group-open:rotate-45">
                    +
                  </span>
                </summary>
                <p className="mt-3 text-sm text-foreground/60">{faq.answer}</p>
              </details>
            ))}
          </div>
        </Container>
      </section>

      <section className="pb-20">
        <Container className="flex flex-col items-start justify-between gap-8 rounded-2xl border border-accent/15 bg-surface-mint px-10 py-14 md:flex-row md:items-center">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-brand">
              Discutons de votre projet
            </h2>
            <p className="mt-2 max-w-md text-foreground/60">
              Décrivez-nous vos locaux : type de site, surface, fréquence souhaitée. On revient
              vers vous sous 72 h ouvrées avec une proposition adaptée.
            </p>
          </div>
          <Link
            href="/contact"
            className="shrink-0 rounded-lg bg-accent-dark px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-accent-darker"
          >
            Nous contacter
          </Link>
        </Container>
      </section>
    </>
  );
}
