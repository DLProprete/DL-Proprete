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

export function generateStaticParams() {
  return cities.map((city) => ({ city: city.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ city: string }>;
}): Promise<Metadata> {
  const { city: slug } = await params;
  const city = getCity(slug);
  if (!city) return {};
  return {
    title: `Nettoyage professionnel à ${city.name}`,
    description: `DL Propreté intervient à ${city.name} : ${city.intro}`,
    alternates: { canonical: `/zone-intervention/${city.slug}` },
  };
}

export default async function CityPage({
  params,
}: {
  params: Promise<{ city: string }>;
}) {
  const { city: slug } = await params;
  const city = getCity(slug);
  if (!city) notFound();

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
          <Link
            href="/zone-intervention"
            className="text-sm font-medium text-foreground/50 hover:text-brand"
          >
            Zone d&apos;intervention
          </Link>
          <p className="mt-3 text-sm font-semibold uppercase tracking-wide text-accent-dark">
            {city.name}
          </p>
          <h1 className="mt-2 text-4xl font-bold tracking-tight text-brand">
            Nettoyage professionnel à {city.name}
          </h1>
          <p className="mt-4 max-w-2xl text-foreground/60">{city.intro}</p>
        </Container>
      </section>

      <section className="py-16">
        <Container className="grid gap-10 md:grid-cols-2">
          <div>
            <h2 className="text-lg font-semibold text-brand">
              Ce qu&apos;on fait le plus souvent à {city.name}
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
            <h2 className="text-lg font-semibold text-brand">Nos services</h2>
            <ul className="mt-3 space-y-3">
              {services.map((service) => {
                const Icon = SERVICE_ICONS[service.slug];
                return (
                  <li key={service.slug}>
                    <Link
                      href={`/zone-intervention/${city.slug}/${service.slug}`}
                      className="group/link flex items-center gap-3 rounded-xl border border-black/5 bg-surface-mint p-4 transition-colors hover:border-accent/30"
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-black/5 bg-white text-brand">
                        <Icon className="h-4 w-4" />
                      </span>
                      <span className="text-sm font-medium text-brand">{service.title}</span>
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
        <Container className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
          <div>
            <h2 className="text-2xl font-bold text-brand">
              Un site hors de {city.name} ?
            </h2>
            <p className="mt-2 text-foreground/60">
              On intervient à {business.serviceArea[0]} — voir l&apos;ensemble
              de notre zone.
            </p>
          </div>
          <Link
            href="/zone-intervention"
            className="shrink-0 rounded-lg border border-brand/15 px-6 py-3 text-sm font-semibold text-brand transition-colors hover:bg-brand/5"
          >
            Voir toute la zone d&apos;intervention
          </Link>
        </Container>
      </section>
    </>
  );
}
