"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Upload } from "lucide-react";
import { tooLargeMessage } from "@/lib/compress-image";
import { ocrDocument, sha256Hex, stopOcr } from "@/lib/browser-ocr";
import { isScannedDocumentKnownAction, uploadScannedDocumentAction } from "./actions";

type Report = { created: number; skipped: number; rejected: string[] };

const isAccepted = (file: File) => file.type === "application/pdf" || file.type.startsWith("image/");

// Le bouton natif d'un <input type="file"> ("Choisir les fichiers") est
// fixé par le navigateur, pas par le texte de la page — il ne se lit pas
// comme cliquable. Ici, la zone entière est un <label> stylé qui déclenche
// le même input, rendu invisible mais toujours fonctionnel (comportement
// HTML natif, htmlFor/id, aucune logique de clic à écrire).
//
// Chaque fichier est lu dans le navigateur (src/lib/browser-ocr.ts : PDF
// scanné page par page, aucune limite de durée serveur), puis envoyé seul
// avec son texte : un lot entier dans une requête dépasserait les plafonds.
export function DocumentUploadField() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [progress, setProgress] = useState<string | null>(null);
  const [report, setReport] = useState<Report | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  async function importOne(file: File, index: number, total: number, result: Report) {
    const label = `Fichier ${index + 1}/${total}`;
    if (!isAccepted(file)) {
      result.rejected.push(`« ${file.name} » : format non pris en charge (PDF ou image).`);
      return;
    }
    setProgress(`${label} — vérification…`);
    const contentHash = await sha256Hex(file);
    if (await isScannedDocumentKnownAction(contentHash)) {
      result.skipped += 1;
      return;
    }
    const ocr = await ocrDocument(file, (page, pages) => setProgress(`${label} — lecture page ${page}/${pages}`));
    const tooLarge = tooLargeMessage(ocr.archive);
    if (tooLarge) {
      result.rejected.push(`${tooLarge} Rescanner en 150-200 dpi, niveaux de gris.`);
      return;
    }
    setProgress(`${label} — envoi…`);
    const formData = new FormData();
    formData.set("file", ocr.archive);
    formData.set("contentHash", contentHash);
    formData.set("ocrText", ocr.text);
    formData.set("pageCount", String(ocr.pageCount));
    const status = await uploadScannedDocumentAction(formData);
    if (status === "created") result.created += 1;
    else if (status === "duplicate") result.skipped += 1;
    else result.rejected.push(`« ${file.name} » : refusé par le serveur (format ou taille).`);
  }

  function handleImport() {
    startTransition(async () => {
      const result: Report = { created: 0, skipped: 0, rejected: [] };
      setReport(null);
      for (const [index, file] of files.entries()) {
        try {
          await importOne(file, index, files.length, result);
        } catch (error) {
          console.error(`[documents] échec pour ${file.name} :`, error);
          result.rejected.push(`« ${file.name} » : lecture ou envoi impossible, à réessayer.`);
        }
      }
      await stopOcr();
      setReport(result);
      setProgress(null);
      setFiles([]);
      if (inputRef.current) inputRef.current.value = "";
      router.refresh();
    });
  }

  return (
    <div className="card space-y-3">
      <label
        htmlFor="files"
        className="mt-1 flex cursor-pointer items-center gap-3 rounded-lg border border-dashed border-zinc-300 px-4 py-4 text-sm text-zinc-700 hover:border-zinc-400 hover:bg-zinc-50"
      >
        <Upload size={20} strokeWidth={2} aria-hidden className="shrink-0 text-zinc-500" />
        <span>
          <span className="font-medium text-zinc-900">Cliquer pour ajouter un fichier ou un dossier</span>
          <br />
          <span className="text-xs text-zinc-500">
            Factures, contrats (PDF multipage) ou images — lus sur cet ordinateur, puis envoyés. Sélectionner un dossier
            dépose tout son contenu.
          </span>
        </span>
      </label>
      <input
        ref={inputRef}
        id="files"
        name="files"
        type="file"
        multiple
        // @ts-expect-error -- webkitdirectory n'est pas dans le typage React, mais bien supporté par les navigateurs
        webkitdirectory=""
        className="sr-only"
        onChange={(event) => setFiles(Array.from(event.target.files ?? []))}
      />
      {files.length > 0 && !isPending && (
        <p className="text-sm text-zinc-600">
          {files.length} fichier{files.length > 1 ? "s" : ""} sélectionné{files.length > 1 ? "s" : ""} :{" "}
          {files.map((f) => f.name).join(", ")}
        </p>
      )}
      <button
        type="button"
        onClick={handleImport}
        disabled={isPending || files.length === 0}
        className="btn btn-secondary"
      >
        {progress ?? "Importer les fichiers"}
      </button>
      {isPending && (
        <p className="text-xs text-zinc-500">Laisser cette page ouverte pendant la lecture (quelques secondes par page).</p>
      )}
      {report && (
        <div className="text-sm text-zinc-700">
          <p>
            {report.created} importé{report.created > 1 ? "s" : ""}
            {report.skipped > 0 && ` · ${report.skipped} déjà présent${report.skipped > 1 ? "s" : ""} (ignoré${report.skipped > 1 ? "s" : ""})`}
            {report.rejected.length > 0 && ` · ${report.rejected.length} refusé${report.rejected.length > 1 ? "s" : ""}`}
          </p>
          {report.rejected.length > 0 && (
            <ul className="mt-1 list-disc pl-5 text-red-600">
              {report.rejected.map((message) => (
                <li key={message}>{message}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
