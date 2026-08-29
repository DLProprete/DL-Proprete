import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

// Frontière de confiance : fichier envoyé par un utilisateur. Validation
// type/taille faite ici, pas différée à un futur "durcissement" (docs/
// ARCHITECTURE.md section 4, remarque module 9).
const UPLOAD_ROOT = path.join(process.cwd(), "uploads");
const MAX_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_EXTENSIONS: Record<string, string> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
};

export class InvalidUploadError extends Error {}

// Retourne un chemin relatif à UPLOAD_ROOT (à stocker tel quel, ex. en
// documentPath) ; le nom de fichier est entièrement généré, jamais dérivé
// du nom fourni par l'utilisateur (pas de traversée de chemin possible).
export async function saveUpload(subdir: string, file: File): Promise<string> {
  if (!file || file.size === 0) {
    throw new InvalidUploadError("Fichier manquant ou vide.");
  }
  if (file.size > MAX_SIZE_BYTES) {
    throw new InvalidUploadError("Fichier trop volumineux (5 Mo maximum).");
  }
  const extension = ALLOWED_EXTENSIONS[file.type];
  if (!extension) {
    throw new InvalidUploadError("Format non autorisé (PDF ou JPEG uniquement).");
  }

  // turbopackIgnore : chemin construit dynamiquement (dossier `uploads/`
  // hors de l'arborescence source) — sans ça, Turbopack trace tout le
  // projet en croyant qu'il doit embarquer ce dossier dans le build.
  const dir = path.join(/* turbopackIgnore: true */ UPLOAD_ROOT, subdir);
  await mkdir(dir, { recursive: true });
  const relativePath = path.join(subdir, `${randomUUID()}.${extension}`);
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(/* turbopackIgnore: true */ UPLOAD_ROOT, relativePath), buffer);

  return relativePath;
}

export async function readUpload(relativePath: string): Promise<Buffer> {
  const resolved = path.resolve(UPLOAD_ROOT, relativePath);
  if (!resolved.startsWith(UPLOAD_ROOT + path.sep)) {
    throw new InvalidUploadError("Chemin de fichier invalide.");
  }
  return readFile(resolved);
}
