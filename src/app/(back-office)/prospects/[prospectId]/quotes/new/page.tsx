import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSession } from "@/server/auth/session";
import { getProspect } from "@/server/prospects/queries";
import { createQuoteAction } from "@/app/(back-office)/quotes/actions";

export default async function NewQuotePage({
  params,
  searchParams,
}: {
  params: Promise<{ prospectId: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { prospectId } = await params;
  const { error } = await searchParams;
  const user = await requireSession();
  const prospect = await getProspect(user, prospectId);
  if (!prospect) notFound();

  return (
    <div className="max-w-2xl space-y-4">
      <h1 className="text-xl font-semibold">Nouveau devis — {prospect.legalName}</h1>
      {error === "empty" && <p className="alert alert-danger">Ajoutez au moins une ligne.</p>}
      <form action={createQuoteAction.bind(null, prospect.id)} className="card space-y-4">
        <div>
          <label htmlFor="validUntil" className="block text-sm text-zinc-700">Valable jusqu&apos;au</label>
          <input id="validUntil" name="validUntil" type="date" className="mt-1 field" />
        </div>
        <div className="space-y-2">
          <p className="text-sm font-medium text-zinc-700">Lignes (3 maximum pour commencer)</p>
          {[1, 2, 3].map((index) => (
            <div key={index} className="grid grid-cols-4 gap-2">
              <input name="label" placeholder={`Prestation ${index}`} className="col-span-2 field field-sm" />
              <input name="quantity" type="number" step="0.01" min="0" placeholder="Qté" className="field field-sm" />
              <input name="unitPriceHT" type="number" step="0.01" min="0" placeholder="PU HT" className="field field-sm" />
              <input type="hidden" name="vatRate" value="20" />
            </div>
          ))}
        </div>
        <div>
          <label htmlFor="notes" className="block text-sm text-zinc-700">Notes</label>
          <textarea id="notes" name="notes" rows={3} className="mt-1 w-full field" />
        </div>
        <button type="submit" className="btn btn-dark">Enregistrer le devis</button>
      </form>
      <Link href={`/prospects/${prospect.id}`} className="text-sm underline">Retour au prospect</Link>
    </div>
  );
}
