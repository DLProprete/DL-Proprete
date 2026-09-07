import Link from "next/link";
import { Container } from "@/components/container";

export default function NotFound() {
  return (
    <section className="py-24">
      <Container className="max-w-lg text-center">
        <p className="text-sm font-semibold uppercase tracking-wide text-accent-dark">
          Erreur 404
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-brand">
          Cette page n&apos;existe pas ou plus
        </h1>
        <p className="mt-4 text-foreground/60">
          Le lien est peut-être obsolète. Retrouvez nos services et zones d&apos;intervention
          depuis l&apos;accueil, ou contactez-nous directement.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/"
            className="rounded-full bg-accent-dark px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-accent/20 transition-all hover:-translate-y-0.5 hover:bg-accent-darker"
          >
            Retour à l&apos;accueil
          </Link>
          <Link
            href="/contact"
            className="rounded-full border border-brand/15 px-6 py-3 text-sm font-semibold text-brand transition-colors hover:bg-brand/5"
          >
            Nous contacter
          </Link>
        </div>
      </Container>
    </section>
  );
}
