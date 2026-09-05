import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/container";
import { ArrowRightIcon } from "@/components/icons";
import { posts } from "@/lib/blog";

export const metadata: Metadata = {
  title: "Blog",
  description:
    "Conseils pratiques sur l'entretien des locaux professionnels et des parties communes — par DL Propreté.",
  alternates: { canonical: "/blog" },
};

function formatDate(date: string) {
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "long" }).format(new Date(date));
}

export default function BlogIndexPage() {
  return (
    <section className="py-16">
      <Container>
        <p className="text-sm font-semibold uppercase tracking-wide text-accent-dark">Blog</p>
        <h1 className="mt-2 text-4xl font-bold tracking-tight text-brand">
          Conseils sur l&apos;entretien des locaux
        </h1>
        <p className="mt-4 max-w-2xl text-foreground/60">
          Des repères pratiques pour les gestionnaires de bureaux, commerces et
          copropriétés — pas de contenu promotionnel, juste ce qu&apos;on a appris
          sur le terrain.
        </p>

        <div className="mt-10 space-y-6">
          {posts.map((post) => (
            <Link
              key={post.slug}
              href={`/blog/${post.slug}`}
              className="group/link block rounded-2xl border border-black/5 bg-surface-mint p-7 transition-all hover:-translate-y-0.5 hover:border-accent/30 hover:shadow-lg hover:shadow-black/5"
            >
              <time className="text-xs font-medium uppercase tracking-wide text-foreground/40">
                {formatDate(post.date)}
              </time>
              <h2 className="mt-2 text-xl font-semibold text-brand">{post.title}</h2>
              <p className="mt-2 text-sm text-foreground/60">{post.description}</p>
              <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-accent-dark">
                Lire l&apos;article
                <ArrowRightIcon className="h-4 w-4 transition-transform group-hover/link:translate-x-1" />
              </span>
            </Link>
          ))}
        </div>
      </Container>
    </section>
  );
}
