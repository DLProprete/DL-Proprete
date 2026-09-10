import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Container } from "@/components/container";
import { business, services, site } from "@/lib/business";
import { cities, getCity } from "@/lib/cities";
import {
  ArrowRightIcon,
  BottleIcon,
  BuildingIcon,
  FactoryIcon,
  ToolboxIcon,
} from "@/components/icons";

const SERVICE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  "nettoyage-industriel": FactoryIcon,
  "nettoyage-batiments": BuildingIcon,
  "negoce-produits-entretien": BottleIcon,
  "manutention-depannages": ToolboxIcon,
};

function getService(slug: string) {
  return services.find((service) => service.slug === slug);
}

export function generateStaticParams() {
  return cities.flatMap((city) =>
    services.map((service) => ({ city: city.slug, service: service.slug })),
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ city: string; service: string }>;
}): Promise<Metadata> {
  const { city: citySlug, service: serviceSlug } = await params;
  const city = getCity(citySlug);
  const service = getService(serviceSlug);
  if (!city || !service) return {};
  return {
    title: `${service.title} à ${city.name}`,
    description: `${service.summary} DL Propreté intervient à ${city.name} et dans tout le secteur.`,
    alternates: { canonical: `/zone-intervention/${city.slug}/${service.slug}` },
  };
}

export default async function CityServicePage({
  params,
}: {
  params: Promise<{ city: string; service: string }>;
}) {
  const { city: citySlug, service: serviceSlug } = await params;
  const city = getCity(citySlug);
  const service = getService(serviceSlug);
  if (!city || !service) notFound();

  const Icon = SERVICE_ICONS[service.slug];
  const otherServices = services.filter((s) => s.slug !== service.slug);
  const otherCities = cities.filter((c) => c.slug !== city.slug);

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Accueil", item: site.url },
      {
        "@type": "ListItem",
        position: 2,
        name: "Zone d'intervention",
        item: `${site.url}/zone-intervention`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: city.name,
        item: `${site.url}/zone-intervention/${city.slug}`,
      },
      {
        "@type": "ListItem",
        position: 4,
        name: service.title,
        item: `${site.url}/zone-intervention/${city.slug}/${service.slug}`,
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <section className="border-b border-black/5 bg-surface-muted py-16">
        <Container>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-medium text-foreground/50">
            <Link href="/zone-intervention" className="hover:text-brand">
              Zone d&apos;intervention
            </Link>
            <span>/</span>
            <Link href={`/zone-intervention/${city.slug}`} className="hover:text-brand">
              {city.name}
            </Link>
          </div>
          <p className="mt-3 text-sm font-semibold uppercase tracking-wide text-accent-dark">
            {city.name}
          </p>
          <h1 className="mt-2 text-4xl font-bold tracking-tight text-brand">
            {service.title} à {city.name}
          </h1>
          <p className="mt-4 max-w-2xl text-foreground/60">{service.summary}</p>
        </Container>
      </section>

      <section className="py-16">
        <Container className="grid gap-10 md:grid-cols-2">
          <div>
            <h2 className="text-lg font-semibold text-brand">
              {service.title} sur {city.name}
            </h2>
            <p className="mt-3 text-foreground/60">{city.focus}</p>
            <Link
              href={`/contact?commune=${encodeURIComponent(city.name)}`}
              className="mt-6 inline-block rounded-lg bg-accent-dark px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-accent-darker"
            >
              Demander un devis à {city.name}
            </Link>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-brand">
              Nos autres prestations à {city.name}
            </h2>
            <ul className="mt-3 space-y-3">
              {otherServices.map((s) => {
                const OtherIcon = SERVICE_ICONS[s.slug];
                return (
                  <li key={s.slug}>
                    <Link
                      href={`/zone-intervention/${city.slug}/${s.slug}`}
                      className="group/link flex items-center gap-3 rounded-xl border border-black/5 bg-surface-mint p-4 transition-colors hover:border-accent/30"
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-black/5 bg-white text-brand">
                        <OtherIcon className="h-4 w-4" />
                      </span>
                      <span className="text-sm font-medium text-brand">{s.title}</span>
                      <ArrowRightIcon className="ml-auto h-4 w-4 text-accent-dark opacity-0 transition-opacity group-hover/link:opacity-100" />
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </Container>
      </section>

      <section className="border-t border-black/5 bg-surface-muted py-16">
        <Container>
          <h2 className="flex items-center gap-2 text-lg font-semibold text-brand">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-black/5 bg-white text-brand">
              <Icon className="h-4 w-4" />
            </span>
            {service.title} ailleurs dans le secteur
          </h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {otherCities.map((c) => (
              <Link
                key={c.slug}
                href={`/zone-intervention/${c.slug}/${service.slug}`}
                className="group/link flex items-center justify-between rounded-xl border border-black/5 bg-surface-mint p-5 transition-colors hover:border-accent/30"
              >
                <span className="font-semibold text-brand">{c.name}</span>
                <ArrowRightIcon className="h-4 w-4 text-accent-dark" />
              </Link>
            ))}
          </div>
          <p className="mt-6 text-foreground/60">
            Un site hors de {city.name} ? On intervient à{" "}
            {business.serviceArea[0]} —{" "}
            <Link href="/zone-intervention" className="font-medium text-brand hover:underline">
              voir l&apos;ensemble de notre zone
            </Link>
            .
          </p>
        </Container>
      </section>
    </>
  );
}
