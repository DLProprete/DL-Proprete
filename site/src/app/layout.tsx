import type { Metadata } from "next";
import { Geist, Geist_Mono, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { business, site } from "@/lib/business";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: `${site.name} — Nettoyage professionnel en Calvados`,
    template: `%s — ${site.name}`,
  },
  description: site.description,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "fr_FR",
    siteName: site.name,
    title: `${site.name} — Nettoyage professionnel en Calvados`,
    description: site.description,
    url: site.url,
  },
  twitter: {
    card: "summary_large_image",
    title: `${site.name} — Nettoyage professionnel en Calvados`,
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
  description: site.description,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="fr"
      className={`${geistSans.variable} ${geistMono.variable} ${spaceGrotesk.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessJsonLd) }}
        />
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
