import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { business, services, site } from "@/lib/business";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: `${site.name} — Nettoyage professionnel à Caen`,
    template: `%s — ${site.name}`,
  },
  description: site.description,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "fr_FR",
    siteName: site.name,
    title: `${site.name} — Nettoyage professionnel à Caen`,
    description: site.description,
    url: site.url,
  },
  twitter: {
    card: "summary_large_image",
    title: `${site.name} — Nettoyage professionnel à Caen`,
    description: site.description,
  },
};

const localBusinessJsonLd = {
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  name: business.name,
  url: site.url,
  email: business.email,
  ...(business.phone ? { telephone: business.phone } : {}),
  address: {
    "@type": "PostalAddress",
    streetAddress: business.address.street,
    postalCode: business.address.postalCode,
    addressLocality: business.address.city,
    addressCountry: "FR",
  },
  areaServed: business.serviceArea,
  foundingDate: `${business.foundedYear}-04`,
  founder: { "@type": "Person", name: business.founder },
  openingHoursSpecification: {
    "@type": "OpeningHoursSpecification",
    dayOfWeek: business.hours.days,
    opens: business.hours.opens,
    closes: business.hours.closes,
  },
  description: site.description,
  vatID: business.vatNumber,
  taxID: business.siret,
  makesOffer: services.map((service) => ({
    "@type": "Offer",
    itemOffered: {
      "@type": "Service",
      name: service.title,
      description: service.summary,
    },
  })),
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="fr"
      className={`${inter.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessJsonLd) }}
        />
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
        <Analytics />
      </body>
    </html>
  );
}
