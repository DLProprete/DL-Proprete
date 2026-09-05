import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/container";
import { business } from "@/lib/business";
import { PinIcon } from "@/components/icons";

export const metadata: Metadata = {
  title: "Zone d'intervention",
  description:
    "DL Propreté intervient dans tout le Calvados, autour de Colombelles et de l'agglomération de Caen, ainsi que sur le reste de la Normandie.",
  alternates: { canonical: "/zone-intervention" },
};

const NEARBY_TOWNS = [
  "Colombelles",
  "Caen",
  "Hérouville-Saint-Clair",
  "Mondeville",
  "Ouistreham",
  "Cabourg",
  "Bayeux",
  "Lisieux",
];

const mapQuery = encodeURIComponent(
  `${business.address.street}, ${business.address.postalCode} ${business.address.city}`,
);

export default function ZoneInterventionPage() {
  return (
    <>
      <section className="border-b border-black/5 bg-surface-muted py-16">
        <Container>
          <p className="text-sm font-semibold uppercase tracking-wide text-accent">
            Zone d&apos;intervention
          </p>
          <h1 className="mt-2 text-4xl font-bold tracking-tight text-brand">
            Basée à Colombelles, active dans tout le Calvados
          </h1>
          <p className="mt-4 max-w-2xl text-foreground/60">
            Depuis notre siège de Colombelles, nous intervenons dans
            l&apos;agglomération de Caen et sur l&apos;ensemble du{" "}
            {business.serviceArea.join(" et de la ")}. Pour un site hors de
            cette zone, contactez-nous : nous étudions chaque demande.
          </p>
        </Container>
      </section>

      <section className="py-16">
        <Container className="grid gap-10 md:grid-cols-2">
          <div className="overflow-hidden rounded-2xl border border-black/5">
            <iframe
              title="Localisation de DL Propreté à Colombelles"
              src={`https://maps.google.com/maps?q=${mapQuery}&output=embed`}
              className="h-80 w-full md:h-full"
              loading="lazy"
            />
          </div>
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-brand">
                Secteurs habituellement desservis
              </h2>
              <ul className="mt-3 grid grid-cols-2 gap-2 text-sm text-foreground/60">
                {NEARBY_TOWNS.map((town) => (
                  <li key={town} className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                    {town}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h2 className="flex items-center gap-2 text-lg font-semibold text-brand">
                <PinIcon className="h-4 w-4 text-accent" />
                Notre siège
              </h2>
              <address className="mt-3 not-italic text-sm text-foreground/60">
                {business.address.street}
                <br />
                {business.address.postalCode} {business.address.city}
              </address>
            </div>
            <Link
              href="/contact"
              className="inline-block rounded-full bg-accent px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-accent/20 transition-all hover:-translate-y-0.5 hover:bg-accent-dark"
            >
              Vérifier si nous intervenons chez vous
            </Link>
          </div>
        </Container>
      </section>
    </>
  );
}
