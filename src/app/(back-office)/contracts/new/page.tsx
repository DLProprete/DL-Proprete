import Link from "next/link";
import { requireSession } from "@/server/auth/session";
import { listClients } from "@/server/clients/queries";
import { getScannedDocument } from "@/server/scanned-documents/queries";
import { formatDateOnly } from "@/lib/dates";
import { createContractAction } from "../actions";

// Reprise d'un contrat papier (?fromDocument=) : champs pré-remplis depuis le
// scan validé, client verrouillé pour qu'il corresponde à celui du scan.
async function scannedContractDefaults(user: Awaited<ReturnType<typeof requireSession>>, documentId: string | undefined) {
  if (!documentId) return null;
  const document = await getScannedDocument(user, documentId);
  if (!document || document.documentType !== "CONTRAT" || document.status !== "VALIDATED" || document.contractId || !document.clientId) {
    return null;
  }
  const notes = [
    `Repris du contrat papier « ${document.originalName} »${document.signedOn ? `, signé le ${formatDateOnly(document.signedOn)}` : ""}.`,
    document.pricing && `Tarif lu sur le contrat : ${document.pricing}`,
    document.noticeDays !== null && `Préavis : ${document.noticeDays} jours.`,
    document.tacitRenewal !== null && `Reconduction tacite : ${document.tacitRenewal ? "oui" : "non"}.`,
    document.siteAddresses && `Site(s) : ${document.siteAddresses.replace(/\n/g, " ; ")}`,
  ]
    .filter(Boolean)
    .join("\n");
  return {
    id: document.id,
    name: document.originalName,
    clientId: document.clientId,
    startsOn: document.contractStartsOn ? formatDateOnly(document.contractStartsOn) : "",
    endsOn: document.contractEndsOn ? formatDateOnly(document.contractEndsOn) : "",
    notes,
  };
}

export default async function NewContractPage({
  searchParams,
}: {
  searchParams: Promise<{ clientId?: string; error?: string; fromDocument?: string }>;
}) {
  const { clientId, error, fromDocument } = await searchParams;
  const user = await requireSession();
  const clients = await listClients(user);
  const scan = await scannedContractDefaults(user, fromDocument);

  return (
    <div className="max-w-lg space-y-4">
      <h1 className="text-xl font-semibold">Nouveau contrat-cadre</h1>
      <p className="text-sm text-zinc-600">
        Le contrat-cadre couvre un client ; les sites (et leur tarif propre) s&apos;ajoutent
        ensuite depuis la fiche du contrat.
      </p>
      {scan && (
        <p className="alert alert-info">
          Reprise du contrat papier{" "}
          <Link href={`/documents/${scan.id}`} className="underline">
            « {scan.name} »
          </Link>{" "}
          : vérifiez les dates (un contrat reconduit tacitement doit porter la période en cours).
        </p>
      )}
      {error && (
        <p className="alert alert-danger">
          {error}
        </p>
      )}
      <form action={createContractAction} className="card space-y-4">
        {scan && <input type="hidden" name="fromDocument" value={scan.id} />}
        {scan && <input type="hidden" name="clientId" value={scan.clientId} />}
        <div>
          <label htmlFor="clientId" className="block text-sm text-zinc-700">
            Client
          </label>
          <select
            id="clientId"
            name={scan ? undefined : "clientId"}
            required={!scan}
            disabled={Boolean(scan)}
            defaultValue={scan?.clientId ?? clientId ?? ""}
            className="mt-1 w-full field"
          >
            <option value="" disabled>
              Sélectionner un client
            </option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.legalName}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="reference" className="block text-sm text-zinc-700">
            Référence
          </label>
          <input
            id="reference"
            name="reference"
            required
            placeholder="C-2026-001"
            className="mt-1 w-full field"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="startsOn" className="block text-sm text-zinc-700">
              Début
            </label>
            <input
              id="startsOn"
              name="startsOn"
              type="date"
              required
              defaultValue={scan?.startsOn}
              className="mt-1 w-full field"
            />
          </div>
          <div>
            <label htmlFor="endsOn" className="block text-sm text-zinc-700">
              Fin
            </label>
            <input
              id="endsOn"
              name="endsOn"
              type="date"
              required
              defaultValue={scan?.endsOn}
              className="mt-1 w-full field"
            />
          </div>
        </div>
        <div>
          <label htmlFor="status" className="block text-sm text-zinc-700">
            Statut initial
          </label>
          <select
            id="status"
            name="status"
            defaultValue={scan ? "ACTIVE" : "DRAFT"}
            className="mt-1 w-full field"
          >
            <option value="DRAFT">Brouillon</option>
            <option value="ACTIVE">Actif</option>
          </select>
        </div>
        <div>
          <label htmlFor="notes" className="block text-sm text-zinc-700">
            Notes
          </label>
          <textarea
            id="notes"
            name="notes"
            rows={scan ? 5 : 3}
            defaultValue={scan?.notes}
            className="mt-1 w-full field"
          />
        </div>
        <button
          type="submit"
          className="btn btn-dark"
        >
          Créer le contrat-cadre
        </button>
      </form>
    </div>
  );
}
