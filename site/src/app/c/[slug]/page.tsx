import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Container } from "@/components/container";
import { MailIcon, PhoneIcon, PinIcon } from "@/components/icons";
import { business, site } from "@/lib/business";
import { contactCards, getContactCard } from "@/lib/contact-cards";

// Page ouverte par le QR code des cartes de visite. Hors sitemap, non indexée.
export const dynamicParams = false;

export function generateStaticParams() {
  return contactCards.map((card) => ({ slug: card.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const card = getContactCard((await params).slug);
  if (!card) return {};
  return {
    title: `${card.firstName} ${card.lastName}`,
    robots: { index: false, follow: false },
  };
}

export default async function ContactCardPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const card = getContactCard((await params).slug);
  if (!card) notFound();

  const { street, postalCode, city } = business.address;
  const linkClass = "flex items-center gap-3 text-foreground/80 hover:text-brand";

  return (
    <Container className="py-16">
      <div className="mx-auto max-w-md rounded-2xl border border-black/5 bg-surface-muted p-8">
        <h1 className="text-2xl font-semibold text-brand">
          {card.firstName} {card.lastName}
        </h1>
        <p className="mt-1 text-foreground/60">
          {card.title} · {business.name}
        </p>

        <a
          href={`/c/${card.slug}/vcard`}
          className="mt-8 block rounded-lg bg-accent-dark px-5 py-3 text-center font-semibold text-white transition-colors hover:bg-accent-darker"
        >
          Ajouter aux contacts
        </a>

        <div className="mt-8 space-y-4 text-sm">
          <a href={`tel:${card.phone.replace(/\s/g, "")}`} className={linkClass}>
            <PhoneIcon className="h-4 w-4 text-brand" />
            {card.phone}
          </a>
          <a href={`mailto:${card.email}`} className={linkClass}>
            <MailIcon className="h-4 w-4 text-brand" />
            {card.email}
          </a>
          <p className="flex items-center gap-3 text-foreground/80">
            <PinIcon className="h-4 w-4 text-brand" />
            {street}, {postalCode} {city}
          </p>
          <a href={site.url} className={linkClass}>
            <span className="h-4 w-4" aria-hidden />
            {site.url.replace("https://", "")}
          </a>
        </div>
      </div>
    </Container>
  );
}
