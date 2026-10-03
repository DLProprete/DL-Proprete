import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { RegisterServiceWorker } from "@/components/register-service-worker";

// Police de la charte, auto-hébergée par next/font (fichiers embarqués au
// build, aucun appel à Google) et mise en cache : disponible hors connexion.
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${inter.variable} antialiased`}>
      <body className="flex flex-col">
        {children}
        <RegisterServiceWorker />
      </body>
    </html>
  );
}
