import Link from "next/link";
import { listQuotesForProspect } from "@/server/quotes/queries";
import type { SessionUser } from "@/server/auth/session";

const STATUS: Record<string, string> = {
  DRAFT: "Brouillon",
  SENT: "Envoyé",
  ACCEPTED: "Accepté",
  REJECTED: "Refusé",
};

export async function ProspectQuotesBlock({ user, prospectId }: { user: SessionUser; prospectId: string }) {
  const quotes = await listQuotesForProspect(user, prospectId);
  return (
    <div className="card space-y-2">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-zinc-700">Devis</h2>
        <Link href={`/prospects/${prospectId}/quotes/new`} className="btn btn-secondary btn-xs">
          Nouveau devis
        </Link>
      </div>
      <ul className="text-sm">
        {quotes.map((quote) => (
          <li key={quote.id} className="flex justify-between border-b border-zinc-100 py-1">
            <Link href={`/quotes/${quote.id}`} className="underline">{quote.reference}</Link>
            <span className="text-zinc-600">
              {STATUS[quote.status]} — {Number(quote.amountTTC).toFixed(2)} €
            </span>
          </li>
        ))}
        {quotes.length === 0 && <li className="text-zinc-500">Aucun devis.</li>}
      </ul>
    </div>
  );
}
