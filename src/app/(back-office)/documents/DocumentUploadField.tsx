"use client";

import { useState } from "react";
import { Upload } from "lucide-react";

// Le bouton natif d'un <input type="file"> ("Choisir les fichiers") est
// fixé par le navigateur, pas par le texte de la page — il ne se lit pas
// comme cliquable. Ici, la zone entière est un <label> stylé qui déclenche
// le même input, rendu invisible mais toujours fonctionnel (comportement
// HTML natif, htmlFor/id, aucune logique de clic à écrire).
export function DocumentUploadField() {
  const [fileNames, setFileNames] = useState<string[]>([]);

  return (
    <div>
      <label
        htmlFor="files"
        className="mt-1 flex cursor-pointer items-center gap-3 rounded-lg border border-dashed border-zinc-300 px-4 py-4 text-sm text-zinc-700 hover:border-zinc-400 hover:bg-zinc-50"
      >
        <Upload size={20} strokeWidth={2} aria-hidden className="shrink-0 text-zinc-500" />
        <span>
          <span className="font-medium text-zinc-900">Cliquer pour ajouter un fichier ou un dossier</span>
          <br />
          <span className="text-xs text-zinc-500">PDF, JPEG, PNG — sélectionner un dossier dépose tout son contenu</span>
        </span>
      </label>
      <input
        id="files"
        name="files"
        type="file"
        multiple
        // @ts-expect-error -- webkitdirectory n'est pas dans le typage React, mais bien supporté par les navigateurs
        webkitdirectory=""
        className="sr-only"
        onChange={(event) => setFileNames(Array.from(event.target.files ?? []).map((f) => f.name))}
      />
      {fileNames.length > 0 && (
        <p className="mt-2 text-sm text-zinc-600">
          {fileNames.length} fichier{fileNames.length > 1 ? "s" : ""} sélectionné{fileNames.length > 1 ? "s" : ""} :{" "}
          {fileNames.join(", ")}
        </p>
      )}
    </div>
  );
}
