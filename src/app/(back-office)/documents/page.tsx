import Link from "next/link";
import { requireSession } from "@/server/auth/session";
import { listScannedDocuments, searchScannedDocuments, type DocumentSearch } from "@/server/scanned-documents/queries";
import { formatDateOnly } from "@/lib/dates";
import { ProcessQueueButton } from "./ProcessQueueButton";
import { DocumentUploadField } from "./DocumentUploadField";
import { ContractStateBadge } from "./ContractStateBadge";

const STATUS_LABELS: Record<string, string> = {
  PENDING: "En attente d'OCR",
  OCR_DONE: "À relire",
  VALIDATED: "Validé",
  REJECTED: "Rejeté",
};

const CATEGORY_LABELS: Record<string, string> = {
  COMPTABLE: "Comptable",
  ACHATS: "Achats",
  STOCK: "Stock",
};

const TYPE_LABELS: Record<string, string> = { FACTURE: "Facture", CONTRAT: "Contrat", AUTRE: "Autre" };

type Params = { q?: string; type?: string; state?: string; year?: string };

function parseSearch(params: Params): DocumentSearch {
  const type = params.type === "FACTURE" || params.type === "CONTRAT" || params.type === "AUTRE" ? params.type : undefined;
  const state =
    params.state === "EN_COURS" || params.state === "RECONDUIT" || params.state === "TERMINE" || params.state === "INCONNU"
      ? params.state
      : undefined;
  const year = Number(params.year);
  return {
    q: params.q?.trim() || undefined,
    type,
    state,
    year: Number.isInteger(year) && year >= 1990 && year <= 2100 ? year : undefined,
  };
}

export default async function ScannedDocumentsPage({ searchParams }: { searchParams: Promise<Params> }) {
  const user = await requireSession();
  if (user.role !== "ADMIN" && user.role !== "PLANNER") {
    return null;
  }

  const params = await searchParams;
  const search = parseSearch(params);
  const isFiltered = Boolean(search.q || search.type || search.state || search.year);
  const [documents, pending] = await Promise.all([
    searchScannedDocuments(user, search),
    listScannedDocuments(user, "PENDING"),
  ]);

  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="text-xl font-semibold">Numérisation des documents</h1>

      <DocumentUploadField />

      <ProcessQueueButton pendingIds={pending.map((d) => d.id)} />

      <form method="get" className="card grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="col-span-2 sm:col-span-4">
          <label htmlFor="q" className="block text-sm text-zinc-700">
            Rechercher dans les documents
          </label>
          <input
            id="q"
            name="q"
            type="search"
            defaultValue={params.q ?? ""}
            placeholder="Nom du client, adresse, mot du contrat…"
            className="mt-1 w-full field"
          />
        </div>
        <div>
          <label htmlFor="type" className="block text-sm text-zinc-700">
            Type
          </label>
          <select id="type" name="type" defaultValue={search.type ?? ""} className="mt-1 w-full field">
            <option value="">Tous</option>
            <option value="CONTRAT">Contrats</option>
            <option value="FACTURE">Factures</option>
            <option value="AUTRE">Autres</option>
          </select>
        </div>
        <div>
          <label htmlFor="state" className="block text-sm text-zinc-700">
            Contrat
          </label>
          <select id="state" name="state" defaultValue={search.state ?? ""} className="mt-1 w-full field">
            <option value="">Tous</option>
            <option value="EN_COURS">En cours</option>
            <option value="RECONDUIT">Reconduits tacitement</option>
            <option value="TERMINE">Terminés</option>
            <option value="INCONNU">Dates à compléter</option>
          </select>
        </div>
        <div>
          <label htmlFor="year" className="block text-sm text-zinc-700">
            Année
          </label>
          <input
            id="year"
            name="year"
            type="number"
            min="1990"
            max="2100"
            defaultValue={search.year ?? ""}
            placeholder="2011"
            className="mt-1 w-full field"
          />
        </div>
        <div className="flex items-end gap-3">
          <button type="submit" className="btn btn-secondary">
            Filtrer
          </button>
          {isFiltered && (
            <Link href="/documents" className="text-sm underline">
              Tout afficher
            </Link>
          )}
        </div>
      </form>

      <div>
        <h2 className="text-sm font-medium text-zinc-700">
          Documents ({documents.length}){isFiltered && " — résultats filtrés"}
        </h2>
        <ul className="mt-2 divide-y divide-zinc-100 text-sm">
          {documents.map((document) => (
            <li key={document.id} className="flex items-center justify-between gap-4 py-3">
              <div className="min-w-0">
                <p className="font-medium">
                  {document.status === "PENDING" ? (
                    document.originalName
                  ) : (
                    <Link href={`/documents/${document.id}`} className="hover:underline">
                      {document.originalName}
                    </Link>
                  )}
                  {document.isSensitive && <span className="ml-2 text-xs text-amber-700">Sensible</span>}
                </p>
                <p className="text-zinc-600">
                  {TYPE_LABELS[document.documentType]} · {STATUS_LABELS[document.status] ?? document.status}
                  {document.documentType === "CONTRAT" ? (
                    <>
                      {(document.client?.legalName ?? document.clientNameRaw) &&
                        ` — ${document.client?.legalName ?? document.clientNameRaw}`}
                      {document.contractStartsOn && ` — du ${formatDateOnly(document.contractStartsOn)}`}
                      {document.contractEndsOn && ` au ${formatDateOnly(document.contractEndsOn)}`}
                    </>
                  ) : (
                    <>
                      {document.supplierName && ` — ${document.supplierName}`}
                      {document.category && ` — ${CATEGORY_LABELS[document.category]}`}
                      {document.documentDate && ` — ${formatDateOnly(document.documentDate)}`}
                    </>
                  )}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                {document.documentType === "CONTRAT" && document.status !== "PENDING" && (
                  <ContractStateBadge endsOn={document.contractEndsOn} tacitRenewal={document.tacitRenewal} />
                )}
                {document.status === "OCR_DONE" && (
                  <Link href={`/documents/${document.id}`} className="btn btn-secondary btn-sm">
                    Relire
                  </Link>
                )}
              </div>
            </li>
          ))}
          {documents.length === 0 && (
            <li className="py-3 text-zinc-500">{isFiltered ? "Aucun document ne correspond." : "Aucun document déposé."}</li>
          )}
        </ul>
      </div>

      <a href="/api/exports/scanned-documents" className="text-sm underline">
        Exporter les documents validés (CSV)
      </a>
    </div>
  );
}
