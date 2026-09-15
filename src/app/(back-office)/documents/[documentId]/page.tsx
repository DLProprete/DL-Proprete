import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSession } from "@/server/auth/session";
import { getScannedDocument } from "@/server/scanned-documents/queries";
import { formatDateOnly } from "@/lib/dates";
import { validateScannedDocumentAction, rejectScannedDocumentAction } from "../actions";

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

  const validate = validateScannedDocumentAction.bind(null, document.id);
  const reject = rejectScannedDocumentAction.bind(null, document.id);

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">{document.originalName}</h1>
        <a
          href={`/api/scanned-documents/${document.id}/file`}
          target="_blank"
          rel="noreferrer"
          className="text-sm underline"
        >
          Voir le fichier original
        </a>
      </div>

      {error && <p className="alert alert-danger">{error}</p>}

      <div className="card">
        <h2 className="text-sm font-medium text-zinc-700">Texte extrait (OCR)</h2>
        <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap text-xs text-zinc-600">
          {document.ocrText || "Aucun texte extrait — à compléter entièrement à la main."}
        </pre>
      </div>

      <form action={validate} className="card space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="supplierName" className="block text-sm text-zinc-700">
              Fournisseur
            </label>
            <input
              id="supplierName"
              name="supplierName"
              defaultValue={document.supplierName ?? ""}
              className="mt-1 w-full field"
            />
          </div>
          <div>
            <label htmlFor="category" className="block text-sm text-zinc-700">
              Catégorie
            </label>
            <select
              id="category"
              name="category"
              defaultValue={document.category ?? ""}
              className="mt-1 w-full field"
            >
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
            <input
              id="documentDate"
              name="documentDate"
              type="date"
              defaultValue={document.documentDate ? formatDateOnly(document.documentDate) : ""}
              className="mt-1 w-full field"
            />
          </div>
        </div>
        <div>
          <label htmlFor="reference" className="block text-sm text-zinc-700">
            Référence
          </label>
          <input
            id="reference"
            name="reference"
            defaultValue={document.reference ?? ""}
            className="mt-1 w-full field"
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-zinc-700">
          <input type="checkbox" name="rememberSupplier" defaultChecked />
          Mémoriser ce fournisseur pour la prochaine fois
        </label>
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
