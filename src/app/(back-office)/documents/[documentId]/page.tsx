import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSession } from "@/server/auth/session";
import { getScannedDocument } from "@/server/scanned-documents/queries";
import { listClients } from "@/server/clients/queries";
import { formatDateOnly } from "@/lib/dates";
import { validateScannedDocumentAction, rejectScannedDocumentAction } from "../actions";
import { DocumentTypeSections } from "../DocumentTypeSections";
import { ContractStateBadge } from "../ContractStateBadge";

const dateValue = (date: Date | null) => (date ? formatDateOnly(date) : "");

export default async function ScannedDocumentDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ documentId: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { documentId } = await params;
  const { error } = await searchParams;
  const user = await requireSession();
  if (user.role !== "ADMIN" && user.role !== "PLANNER") {
    return null;
  }

  const document = await getScannedDocument(user, documentId);
  if (!document) notFound();
  const clients = await listClients(user);

  const validate = validateScannedDocumentAction.bind(null, document.id);
  const reject = rejectScannedDocumentAction.bind(null, document.id);
  const isValidatedContract = document.status === "VALIDATED" && document.documentType === "CONTRAT";

  const invoiceFields = (
    <>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="supplierName" className="block text-sm text-zinc-700">
            Fournisseur
          </label>
          <input id="supplierName" name="supplierName" defaultValue={document.supplierName ?? ""} className="mt-1 w-full field" />
        </div>
        <div>
          <label htmlFor="category" className="block text-sm text-zinc-700">
            Catégorie
          </label>
          <select id="category" name="category" defaultValue={document.category ?? ""} className="mt-1 w-full field">
            <option value="">Non renseigné</option>
            <option value="COMPTABLE">Comptable</option>
            <option value="ACHATS">Achats</option>
            <option value="STOCK">Stock</option>
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="amountTtc" className="block text-sm text-zinc-700">
            Montant TTC
          </label>
          <input
            id="amountTtc"
            name="amountTtc"
            type="number"
            step="0.01"
            min="0"
            defaultValue={document.amountTtc !== null ? Number(document.amountTtc) : ""}
            className="mt-1 w-full field"
          />
        </div>
        <div>
          <label htmlFor="documentDate" className="block text-sm text-zinc-700">
            Date du document
          </label>
          <input id="documentDate" name="documentDate" type="date" defaultValue={dateValue(document.documentDate)} className="mt-1 w-full field" />
        </div>
      </div>
      <div>
        <label htmlFor="reference" className="block text-sm text-zinc-700">
          Référence
        </label>
        <input id="reference" name="reference" defaultValue={document.reference ?? ""} className="mt-1 w-full field" />
      </div>
      <label className="flex items-center gap-2 text-sm text-zinc-700">
        <input type="checkbox" name="rememberSupplier" defaultChecked />
        Mémoriser ce fournisseur pour la prochaine fois
      </label>
    </>
  );

  const contractFields = (
    <>
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-zinc-800">Contrat</p>
        <ContractStateBadge endsOn={document.contractEndsOn} tacitRenewal={document.tacitRenewal} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="clientId" className="block text-sm text-zinc-700">
            Client (fiche de l&apos;outil)
          </label>
          <select id="clientId" name="clientId" defaultValue={document.clientId ?? ""} className="mt-1 w-full field">
            <option value="">— Pas (encore) de fiche client —</option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.legalName}
                {client.isActive ? "" : " (inactif)"}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="clientNameRaw" className="block text-sm text-zinc-700">
            Client tel qu&apos;écrit sur le contrat
          </label>
          <input id="clientNameRaw" name="clientNameRaw" defaultValue={document.clientNameRaw ?? ""} className="mt-1 w-full field" />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label htmlFor="signedOn" className="block text-sm text-zinc-700">
            Signé le
          </label>
          <input id="signedOn" name="signedOn" type="date" defaultValue={dateValue(document.signedOn)} className="mt-1 w-full field" />
        </div>
        <div>
          <label htmlFor="contractStartsOn" className="block text-sm text-zinc-700">
            Début
          </label>
          <input
            id="contractStartsOn"
            name="contractStartsOn"
            type="date"
            defaultValue={dateValue(document.contractStartsOn)}
            className="mt-1 w-full field"
          />
        </div>
        <div>
          <label htmlFor="contractEndsOn" className="block text-sm text-zinc-700">
            Fin
          </label>
          <input
            id="contractEndsOn"
            name="contractEndsOn"
            type="date"
            defaultValue={dateValue(document.contractEndsOn)}
            className="mt-1 w-full field"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="tacitRenewal" className="block text-sm text-zinc-700">
            Reconduction tacite
          </label>
          <select
            id="tacitRenewal"
            name="tacitRenewal"
            defaultValue={document.tacitRenewal === null ? "" : String(document.tacitRenewal)}
            className="mt-1 w-full field"
          >
            <option value="">Non renseigné</option>
            <option value="true">Oui</option>
            <option value="false">Non</option>
          </select>
        </div>
        <div>
          <label htmlFor="noticeDays" className="block text-sm text-zinc-700">
            Préavis (jours)
          </label>
          <input
            id="noticeDays"
            name="noticeDays"
            type="number"
            min="0"
            defaultValue={document.noticeDays ?? ""}
            className="mt-1 w-full field"
          />
        </div>
      </div>
      <div>
        <label htmlFor="pricing" className="block text-sm text-zinc-700">
          Prix / tarif
        </label>
        <input id="pricing" name="pricing" defaultValue={document.pricing ?? ""} className="mt-1 w-full field" />
      </div>
      <div>
        <label htmlFor="siteAddresses" className="block text-sm text-zinc-700">
          Adresse(s) du ou des sites
        </label>
        <textarea
          id="siteAddresses"
          name="siteAddresses"
          rows={2}
          defaultValue={document.siteAddresses ?? ""}
          className="mt-1 w-full field"
        />
      </div>
    </>
  );

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">{document.originalName}</h1>
        <a href={`/api/scanned-documents/${document.id}/file`} target="_blank" rel="noreferrer" className="text-sm underline">
          Voir le fichier{document.pageCount && document.pageCount > 1 ? ` (${document.pageCount} pages)` : ""}
        </a>
      </div>

      {error && <p className="alert alert-danger">{error}</p>}

      {isValidatedContract && (
        <div className="card flex flex-wrap items-center justify-between gap-3 text-sm">
          {document.contractId ? (
            <>
              <span>Ce contrat est repris dans l&apos;outil.</span>
              <Link href={`/contracts/${document.contractId}`} className="underline">
                Voir le contrat
              </Link>
            </>
          ) : document.clientId ? (
            <>
              <span>Contrat en cours ? Reprenez-le dans l&apos;outil pour le planning et la facturation.</span>
              <Link href={`/contracts/new?fromDocument=${document.id}`} className="btn btn-dark">
                Créer ce contrat dans l&apos;outil
              </Link>
            </>
          ) : (
            <span className="text-zinc-600">
              Pour reprendre ce contrat dans l&apos;outil, créez d&apos;abord la{" "}
              <Link href="/clients/new" className="underline">
                fiche client
              </Link>
              , puis associez-la ci-dessous.
            </span>
          )}
        </div>
      )}

      <div className="card">
        <h2 className="text-sm font-medium text-zinc-700">Texte extrait (OCR)</h2>
        <pre className="mt-2 max-h-80 overflow-auto whitespace-pre-wrap text-xs text-zinc-600">
          {document.ocrText || "Aucun texte extrait — à compléter entièrement à la main."}
        </pre>
      </div>

      <form action={validate} className="card space-y-4">
        <DocumentTypeSections initialType={document.documentType} invoiceFields={invoiceFields} contractFields={contractFields} />
        {user.role === "ADMIN" && (
          <label className="flex items-center gap-2 text-sm text-zinc-700">
            <input type="checkbox" name="isSensitive" defaultChecked={document.isSensitive} />
            Document sensible (RH / santé) — masqué aux planificateurs
          </label>
        )}
        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" className="btn btn-dark">
            Valider
          </button>
          <Link href="/documents" className="text-sm underline">
            Annuler
          </Link>
        </div>
      </form>

      <form action={reject}>
        <button type="submit" className="text-sm text-red-600 underline">
          Rejeter ce document (doublon, page blanche…)
        </button>
      </form>
    </div>
  );
}
