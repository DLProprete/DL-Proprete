import type { Metadata } from "next";
import { Container } from "@/components/container";
import { business } from "@/lib/business";
import { SparkleIcon } from "@/components/icons";

export const metadata: Metadata = {
  title: "À propos",
  description:
    "DL Propreté, entreprise familiale de nettoyage professionnel basée à Colombelles depuis 2011.",
  alternates: { canonical: "/a-propos" },
};

export default function AProposPage() {
  return (
    <section className="py-16">
      <Container className="max-w-2xl">
        <p className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-accent-dark">
          <SparkleIcon className="h-4 w-4" />À propos
        </p>
        <h1 className="mt-2 text-4xl font-bold tracking-tight text-brand">
          Une entreprise familiale, à Colombelles depuis {business.foundedYear}
        </h1>

        <h2 className="mt-10 text-lg font-semibold text-brand">Notre histoire</h2>
        <p className="mt-3 leading-relaxed text-foreground/70">
          DL Propreté est fondée en {business.foundedYear} à Colombelles par{" "}
          {business.founder} — le nom de l&apos;entreprise vient de ses initiales. Sa fille,{" "}
          {business.leader}, a depuis repris la direction de l&apos;entreprise qu&apos;il a bâtie.
        </p>

        <h2 className="mt-8 text-lg font-semibold text-brand">L&apos;équipe</h2>
        <p className="mt-3 leading-relaxed text-foreground/70">
          DL Propreté, c&apos;est aujourd&apos;hui {business.teamSize} personnes : agents de
          nettoyage, encadrement de site et gestion, toujours basées à Colombelles.
        </p>

        <h2 className="mt-8 text-lg font-semibold text-brand">Notre façon de travailler</h2>
        <ul className="mt-3 space-y-3 leading-relaxed text-foreground/70">
          <li>
            On reste une structure à taille humaine : quand vous appelez, vous parlez à quelqu&apos;un
            qui connaît votre site — pas à un centre d&apos;appel.
          </li>
          <li>
            Basés à Colombelles depuis {business.foundedYear}, on connaît le terrain : les zones
            industrielles du secteur, les copropriétés de l&apos;agglomération, leurs contraintes
            d&apos;accès et d&apos;horaires.
          </li>
          <li>
            L&apos;entreprise se transmet en famille, pas en franchise : la même équipe suit vos
            sites dans la durée.
          </li>
        </ul>
      </Container>
    </section>
  );
}
