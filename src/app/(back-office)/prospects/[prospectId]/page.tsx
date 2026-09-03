import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSession } from "@/server/auth/session";
import { getProspect } from "@/server/prospects/queries";
import { formatDateOnly } from "@/lib/dates";
import { Badge } from "@/components/badge";
import { PROSPECT_STATUS_LABELS, prospectStatusBadge } from "@/lib/prospect-status";
import { updateProspectAction } from "../actions";
import { ProspectQuotesBlock } from "./quotes-block";

const ERROR_MESSAGES: Record<string, string> = {
  "already-converted": "Ce prospect a déjà été converti en client.",
};

export default async function ProspectDetailPage({
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

  const updateProspect = updateProspectAction.bind(null, prospect.id);
  const selectableStatuses = Object.entries(PROSPECT_STATUS_LABELS).filter(([value]) => value !== "WON");

  return (
    <div className="max-w-lg space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">{prospect.legalName}</h1>
        <Badge {...prospectStatusBadge(prospect, new Date())} />
      </div>
      {error && <p className="alert alert-danger">{ERROR_MESSAGES[error] ?? error}</p>}
      {prospect.convertedClientId ? (
        <p className="alert alert-info">
          Converti en client — <Link href={`/clients/${prospect.convertedClientId}`} className="underline">voir la fiche client</Link>.
        </p>
      ) : (
        prospect.status !== "LOST" && (
          <Link href={`/prospects/${prospect.id}/convert`} className="btn btn-primary">Convertir en client</Link>
        )
      )}
      <ProspectQuotesBlock user={user} prospectId={prospect.id} />
      <form action={updateProspect} className="card space-y-4">
        <div>
          <label htmlFor="legalName" className="block text-sm text-zinc-700">Raison sociale</label>
          <input id="legalName" name="legalName" required defaultValue={prospect.legalName} className="mt-1 w-full field" />
        </div>
        <div>
          <label htmlFor="contactName" className="block text-sm text-zinc-700">Nom du contact</label>
          <input id="contactName" name="contactName" defaultValue={prospect.contactName ?? ""} className="mt-1 w-full field" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="email" className="block text-sm text-zinc-700">E-mail</label>
            <input id="email" name="email" type="email" defaultValue={prospect.email ?? ""} className="mt-1 w-full field" />
          </div>
          <div>
            <label htmlFor="phone" className="block text-sm text-zinc-700">Téléphone</label>
            <input id="phone" name="phone" defaultValue={prospect.phone ?? ""} className="mt-1 w-full field" />
          </div>
        </div>
        <div>
          <label htmlFor="address" className="block text-sm text-zinc-700">Adresse</label>
          <input id="address" name="address" defaultValue={prospect.address ?? ""} className="mt-1 w-full field" />
        </div>
        <div>
          <label htmlFor="source" className="block text-sm text-zinc-700">Source</label>
          <input id="source" name="source" defaultValue={prospect.source ?? ""} className="mt-1 w-full field" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="status" className="block text-sm text-zinc-700">Statut</label>
            {prospect.convertedClientId ? (
              <>
                <input type="hidden" name="status" value="WON" />
                <p className="mt-1 field bg-zinc-50 text-zinc-600">{PROSPECT_STATUS_LABELS.WON}</p>
              </>
            ) : (
              <select id="status" name="status" defaultValue={prospect.status} className="mt-1 w-full field">
                {selectableStatuses.map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            )}
          </div>
          <div>
            <label htmlFor="nextFollowUpAt" className="block text-sm text-zinc-700">Prochaine relance</label>
            <input id="nextFollowUpAt" name="nextFollowUpAt" type="date" defaultValue={prospect.nextFollowUpAt ? formatDateOnly(prospect.nextFollowUpAt) : ""} className="mt-1 w-full field" />
          </div>
        </div>
        <div>
          <label htmlFor="notes" className="block text-sm text-zinc-700">Notes</label>
          <textarea id="notes" name="notes" rows={3} defaultValue={prospect.notes ?? ""} className="mt-1 w-full field" />
        </div>
        <button type="submit" className="btn btn-dark">Enregistrer</button>
      </form>
    </div>
  );
}
