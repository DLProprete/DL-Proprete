import Link from "next/link";
import { requireSession } from "@/server/auth/session";
import { listScannedDocuments } from "@/server/scanned-documents/queries";
import { formatDateOnly } from "@/lib/dates";
import { uploadScannedDocumentsAction } from "./actions";
import { ProcessQueueButton } from "./ProcessQueueButton";

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

export default async function ScannedDocumentsPage() {
  const user = await requireSession();
  if (user.role !== "ADMIN" && user.role !== "PLANNER") {
    return null;
  }

  const documents = await listScannedDocuments(user);
  const pendingIds = documents.filter((d) => d.status === "PENDING").map((d) => d.id);

  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="text-xl font-semibold">Numérisation des documents</h1>

      <form action={uploadScannedDocumentsAction} className="card space-y-3">
        <div>
          <label htmlFor="files" className="block text-sm text-zinc-700">
            Déposer un dossier de scans (PDF, JPEG, PNG)
          </label>
          <input
            id="files"
            name="files"
            type="file"
            multiple
            // @ts-expect-error -- webkitdirectory n'est pas dans le typage React, mais bien supporté par les navigateurs
            webkitdirectory=""
            className="mt-1 w-full field"
          />
          <p className="mt-1 text-xs text-zinc-500">
            Sélectionne le dossier contenant les scans — tous les fichiers qu&apos;il contient sont
            déposés d&apos;un coup, puis traités un par un ci-dessous.
          </p>
        </div>
        <button type="submit" className="btn btn-secondary">
          Déposer
        </button>
      </form>

      <ProcessQueueButton pendingIds={pendingIds} />

      <div>
        <h2 className="text-sm font-medium text-zinc-700">Documents ({documents.length})</h2>
        <ul className="mt-2 divide-y divide-zinc-100 text-sm">
          {documents.map((document) => (
            <li key={document.id} className="flex items-center justify-between gap-4 py-3">
              <div>
                <p className="font-medium">
                  {document.originalName}
                  {document.isSensitive && (
                    <span className="ml-2 text-xs text-amber-700">Sensible</span>
                  )}
                </p>
                <p className="text-zinc-600">
                  {STATUS_LABELS[document.status] ?? document.status}
                  {document.supplierName && ` — ${document.supplierName}`}
                  {document.category && ` — ${CATEGORY_LABELS[document.category]}`}
                  {document.documentDate && ` — ${formatDateOnly(document.documentDate)}`}
                </p>
              </div>
              {document.status === "OCR_DONE" && (
                <Link href={`/documents/${document.id}`} className="btn btn-secondary btn-sm">
                  Relire
                </Link>
              )}
            </li>
          ))}
          {documents.length === 0 && <li className="py-3 text-zinc-500">Aucun document déposé.</li>}
        </ul>
      </div>

      <a href="/api/exports/scanned-documents" className="text-sm underline">
        Exporter les documents validés (CSV)
      </a>
    </div>
  );
}
