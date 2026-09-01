import type { Metadata, Viewport } from "next";
import "./globals.css";
import { RegisterServiceWorker } from "@/components/register-service-worker";

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
  themeColor: "#0f766e",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className="antialiased">
      <body className="flex flex-col">
        {children}
        <RegisterServiceWorker />
      </body>
    </html>
  );
}
