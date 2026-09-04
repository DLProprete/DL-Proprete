import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSession } from "@/server/auth/session";
import { getQuote } from "@/server/quotes/queries";
import { acceptQuoteAction, sendQuoteAction } from "../actions";

const STATUS: Record<string, string> = {
  DRAFT: "Brouillon",
  SENT: "Envoyé",
  ACCEPTED: "Accepté",
  REJECTED: "Refusé",
};

export default async function QuotePage({
  params,
  searchParams,
}: {
  params: Promise<{ quoteId: string }>;
  searchParams: Promise<{ sent?: string }>;
}) {
  const { quoteId } = await params;
  const { sent } = await searchParams;
  const user = await requireSession();
  const quote = await getQuote(user, quoteId);
  if (!quote) notFound();

  return (
    <div className="max-w-2xl space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">{quote.reference}</h1>
          <p className="text-sm text-zinc-600">
            <Link href={`/prospects/${quote.prospectId}`} className="underline">{quote.prospect.legalName}</Link>
            {" — "}{STATUS[quote.status]}
          </p>
        </div>
        <div className="flex gap-2">
          {quote.status !== "ACCEPTED" && quote.prospect.email && (
            <form action={sendQuoteAction.bind(null, quote.id)}>
              <button type="submit" className="btn btn-secondary">Envoyer par e-mail</button>
            </form>
          )}
          {quote.status !== "ACCEPTED" && (
            <form action={acceptQuoteAction.bind(null, quote.id)}>
              <button type="submit" className="btn btn-primary">Transformer en contrat</button>
            </form>
          )}
        </div>
      </div>
      {sent && <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">Devis envoyé.</p>}
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-zinc-600">
            <th className="py-2 text-left">Désignation</th>
            <th>Qté</th>
            <th>PU HT</th>
          </tr>
        </thead>
        <tbody>
          {quote.lines.map((line) => (
            <tr key={line.id} className="border-b border-zinc-100">
              <td className="py-2">{line.label}</td>
              <td className="text-center">{Number(line.quantity)}</td>
              <td className="text-right">{Number(line.unitPriceHT).toFixed(2)} €</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-sm font-medium">Total TTC : {Number(quote.amountTTC).toFixed(2)} €</p>
      {quote.notes && <p className="text-sm text-zinc-600">{quote.notes}</p>}
    </div>
  );
}
