import { contactCards, getContactCard, toVCard } from "@/lib/contact-cards";

export const dynamicParams = false;

export function generateStaticParams() {
  return contactCards.map((card) => ({ slug: card.slug }));
}

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const card = getContactCard(slug);
  if (!card) return new Response("Introuvable", { status: 404 });

  return new Response(toVCard(card), {
    headers: {
      "Content-Type": "text/vcard; charset=utf-8",
      "Content-Disposition": `attachment; filename="${card.slug}-dl-proprete.vcf"`,
    },
  });
}
