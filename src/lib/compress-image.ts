// Compression des images dans le navigateur avant envoi : une photo de
// téléphone (3-5 Mo) passe sous le plafond des Server Actions et pèse ~10×
// moins en stockage. Le ré-encodage via <canvas> supprime aussi les
// métadonnées EXIF, dont la position GPS de la photo.

export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;

const PROFILES = {
  photo: { maxSide: 1600, quality: 0.75 },
  // A4 à 300 dpi : garde la lisibilité pour l'OCR.
  document: { maxSide: 2480, quality: 0.85 },
} as const;

export type CompressionProfile = keyof typeof PROFILES;

export function fitWithin(width: number, height: number, maxSide: number) {
  const scale = Math.min(1, maxSide / Math.max(width, height));
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}

// PDF et fichiers non-image renvoyés tels quels. Si le navigateur ne sait
// pas décoder l'image, on renvoie l'original : le serveur répondra avec un
// message clair plutôt que de bloquer l'envoi ici.
export async function compressImage(file: File, profile: CompressionProfile): Promise<File> {
  if (!file.type.startsWith("image/")) return file;
  const { maxSide, quality } = PROFILES[profile];
  try {
    const bitmap = await createImageBitmap(file);
    const { width, height } = fitWithin(bitmap.width, bitmap.height, maxSide);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) return file;
    context.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
    if (!blob) return file;
    const name = file.name.replace(/\.[^.]+$/, "") + ".jpg";
    return new File([blob], name, { type: "image/jpeg", lastModified: file.lastModified });
  } catch {
    return file;
  }
}

export function tooLargeMessage(file: File): string | null {
  return file.size > MAX_UPLOAD_BYTES ? `« ${file.name} » est trop volumineux (4 Mo maximum).` : null;
}
