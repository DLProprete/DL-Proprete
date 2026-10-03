import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";
import { RegisterServiceWorker } from "@/components/register-service-worker";
import { displayAttributes } from "@/lib/display-prefs";
import { getDisplayPrefs } from "@/server/auth/session";

// Police de la charte, auto-hébergée par next/font (fichiers embarqués au
// build, aucun appel à Google) ; gardée par le cache du navigateur après la
// première visite (le service worker ne traite pas /_next/*).
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

// Police de lecture facilitée (réglage « Police dyslexie », page /display).
// preload: false — téléchargée seulement par ceux qui l'activent.
const dyslexic = localFont({
  src: [
    { path: "../fonts/opendyslexic/opendyslexic-latin-400-normal.woff2", weight: "400" },
    { path: "../fonts/opendyslexic/opendyslexic-latin-700-normal.woff2", weight: "700" },
  ],
  variable: "--font-dyslexic",
  preload: false,
  display: "swap",
});

export const metadata: Metadata = {
  title: "DL Propreté",
  description: "Outil interne DL Propreté — planning, pointage, facturation",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "DL Propreté",
  },
};

export const viewport: Viewport = {
  themeColor: "#243746",
};

// Lit la session (cookies) : rend toutes les pages dynamiques, ce qui est déjà
// le cas des pages métier (requireSession).
export default async function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="fr"
      className={`${inter.variable} ${dyslexic.variable} antialiased`}
      {...displayAttributes(await getDisplayPrefs())}
    >
      <body className="flex flex-col">
        {children}
        <RegisterServiceWorker />
      </body>
    </html>
  );
}
