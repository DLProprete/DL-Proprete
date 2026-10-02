"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Upload } from "lucide-react";
import { compressImage, tooLargeMessage } from "@/lib/compress-image";
import { uploadScannedDocumentAction } from "./actions";

type Report = { created: number; skipped: number; rejected: string[] };

const isAccepted = (file: File) => file.type === "application/pdf" || file.type.startsWith("image/");

// Le bouton natif d'un <input type="file"> ("Choisir les fichiers") est
// fixé par le navigateur, pas par le texte de la page — il ne se lit pas
// comme cliquable. Ici, la zone entière est un <label> stylé qui déclenche
// le même input, rendu invisible mais toujours fonctionnel (comportement
// HTML natif, htmlFor/id, aucune logique de clic à écrire).
//
// Envoi fichier par fichier (une Server Action chacun, même principe que
// ProcessQueueButton) : un lot entier dans une seule requête dépassait le
// plafond de taille des Server Actions et de Vercel.
export function DocumentUploadField() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [report, setReport] = useState<Report | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleImport() {
    startTransition(async () => {
      const result: Report = { created: 0, skipped: 0, rejected: [] };
      setReport(null);
      setProgress({ done: 0, total: files.length });
      for (const [index, file] of files.entries()) {
        if (!isAccepted(file)) {
          result.rejected.push(`« ${file.name} » : format non pris en charge (PDF ou image).`);
        } else {
          const prepared = await compressImage(file, "document");
          const tooLarge = tooLargeMessage(prepared);
          if (tooLarge) {
            result.rejected.push(tooLarge);
          } else {
            const formData = new FormData();
            formData.set("file", prepared);
            try {
              const status = await uploadScannedDocumentAction(formData);
              result[status] += 1;
            } catch (error) {
              console.error(`[documents] échec de l'envoi de ${file.name} :`, error);
              result.rejected.push(`« ${file.name} » : échec de l'envoi, à réessayer.`);
            }
          }
        }
        setProgress({ done: index + 1, total: files.length });
      }
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
          <span className="text-xs text-zinc-500">PDF ou images, 4 Mo max par fichier — sélectionner un dossier dépose tout son contenu</span>
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
        {progress ? `Envoi… ${progress.done}/${progress.total}` : "Importer les fichiers"}
      </button>
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
