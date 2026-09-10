import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Container } from "@/components/container";
import { business, site } from "@/lib/business";
import { getPost, posts } from "@/lib/blog";

export function generateStaticParams() {
  return posts.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) return {};
  return {
    title: post.title,
    description: post.description,
    alternates: { canonical: `/blog/${post.slug}` },
  };
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "long" }).format(new Date(date));
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) notFound();

  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.description,
    datePublished: post.date,
    dateModified: post.date,
    author: { "@type": "Organization", name: business.name },
    publisher: { "@type": "Organization", name: business.name },
    mainEntityOfPage: `${site.url}/blog/${post.slug}`,
  };
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Accueil", item: site.url },
      { "@type": "ListItem", position: 2, name: "Blog", item: `${site.url}/blog` },
      { "@type": "ListItem", position: 3, name: post.title, item: `${site.url}/blog/${post.slug}` },
    ],
  };

  return (
    <section className="py-16">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <Container className="max-w-2xl">
        <Link href="/blog" className="text-sm font-medium text-foreground/50 hover:text-brand">
          ← Blog
        </Link>
        <time className="mt-4 block text-xs font-medium uppercase tracking-wide text-foreground/40">
          {formatDate(post.date)}
        </time>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-brand">{post.title}</h1>
        <div className="mt-8 space-y-5 text-foreground/70">
          {post.body.map((paragraph, index) => (
            <p key={index} className="leading-relaxed">
              {paragraph}
            </p>
          ))}
        </div>

        <div className="mt-12 rounded-2xl border border-accent/15 bg-surface-mint p-7">
          <h2 className="font-semibold text-brand">Une question sur votre contrat d&apos;entretien ?</h2>
          <p className="mt-2 text-sm text-foreground/60">
            Décrivez-nous votre situation, on vous répond avec une réponse claire.
          </p>
          <Link
            href="/contact"
            className="mt-4 inline-block rounded-lg bg-accent-dark px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-darker"
          >
            Nous écrire
          </Link>
        </div>
      </Container>
    </section>
  );
}
