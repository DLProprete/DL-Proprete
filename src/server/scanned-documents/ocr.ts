import path from "node:path";
import { createWorker } from "tesseract.js";
import { prisma } from "@/lib/prisma";
import { dateOnlyUTC } from "@/lib/dates";

// Fichier de langue committé dans le dépôt (~700 Ko compressé) plutôt que
// téléchargé depuis le CDN de tesseract.js à chaque appel — coût et
// fiabilité en production (docs/NUMERISATION-DOCUMENTS.md).
const TESSDATA_PATH = path.join(process.cwd(), "assets", "tessdata");

const IMAGE_EXTENSIONS = new Set(["jpg", "jpeg", "png"]);

function extensionOf(filePath: string): string {
  return (filePath.split(".").pop() ?? "").toLowerCase();
}

// OCR local (Tesseract, gratuit) sur une image — pas de tentative sur un
// PDF ici, voir extractPdfText ci-dessous pour ce cas.
async function ocrImage(buffer: Buffer): Promise<string> {
  const worker = await createWorker("fra", undefined, {
    langPath: TESSDATA_PATH,
    cacheMethod: "none",
  });
  try {
    const {
      data: { text },
    } = await worker.recognize(buffer);
    return text;
  } finally {
    await worker.terminate();
  }
}

// Un PDF issu d'un scanner n'a en général pas de calque texte — dans ce
// cas on ne tente pas de rasteriser la page (ça exigerait `canvas`, une
// dépendance native fragile sur un hébergement serverless) : le document
// reste sans texte OCR, à compléter à la main en relecture. Limitation
// connue et acceptée pour la v1 (docs/NUMERISATION-DOCUMENTS.md).
//
// `unpdf` plutôt que `pdfjs-dist` directement : pdfjs-dist charge son
// "worker" via un import dynamique que Turbopack réécrit vers un chunk
// bundlé inexistant (échec systématique en dev comme en prod) — unpdf
// embarque une build de pdfjs-dist spécifiquement patchée pour tourner
// dans un seul thread, sans ce mécanisme.
async function extractPdfText(buffer: Buffer): Promise<string | null> {
  const { getDocumentProxy, extractText } = await import("unpdf");
  const doc = await getDocumentProxy(new Uint8Array(buffer));
  const { text } = await extractText(doc, { mergePages: true });
  const joined = text.trim();
  return joined || null;
}

// Renvoie null si aucun texte n'a pu être extrait (jamais une exception
// qui ferait échouer tout le lot en cours de traitement) — le document
// reste alors à compléter entièrement à la main en relecture.
export async function extractDocumentText(filePath: string, buffer: Buffer): Promise<string | null> {
  const extension = extensionOf(filePath);
  try {
    if (IMAGE_EXTENSIONS.has(extension)) {
      const text = await ocrImage(buffer);
      return text.trim() || null;
    }
    if (extension === "pdf") {
      return await extractPdfText(buffer);
    }
    return null;
  } catch (error) {
    console.error(`[scanned-documents] échec de l'extraction pour ${filePath} :`, error);
    return null;
  }
}

// Rapprochement simple par sous-chaîne, insensible à la casse — pas de
// correspondance floue pour la v1 (cohérent avec "jamais de valeur
// inventée" : mieux vaut ne rien proposer qu'une fausse correspondance).
export async function matchKnownSupplier(text: string): Promise<{ id: string; name: string } | null> {
  const suppliers = await prisma.knownSupplier.findMany();
  const haystack = text.toLowerCase();
  const match = suppliers.find((supplier) => haystack.includes(supplier.matchPattern.toLowerCase()));
  return match ? { id: match.id, name: match.name } : null;
}

// "Total TTC : 1 234,56 €" ou "Total TTC 1234.56" — motif volontairement
// étroit : mieux vaut ne rien extraire qu'un montant erroné (aucune
// confiance aveugle sur un champ comptable).
const AMOUNT_REGEX = /total\s*ttc\D{0,10}(\d[\d\s]*[.,]\d{2})/i;

export function extractAmountTtc(text: string): number | null {
  const match = text.match(AMOUNT_REGEX);
  if (!match) return null;
  const normalized = match[1].replace(/\s/g, "").replace(",", ".");
  const value = Number(normalized);
  return Number.isFinite(value) ? value : null;
}

// Date au format JJ/MM/AAAA — la mise en page réelle des vieux documents
// est inconnue (docs/NUMERISATION-DOCUMENTS.md), ce motif couvre le cas le
// plus courant en France sans prétendre couvrir toutes les variantes.
const DATE_REGEX = /(\d{2})\/(\d{2})\/(\d{4})/;

export function extractDocumentDate(text: string): Date | null {
  const match = text.match(DATE_REGEX);
  if (!match) return null;
  const [, day, month, year] = match;
  const date = dateOnlyUTC(Number(year), Number(month), Number(day));
  return Number.isNaN(date.getTime()) ? null : date;
}

// "Référence de la facture ... : FR67998419" ou "Facture n°FR67998419" —
// une référence est recopiée telle quelle (pas un calcul comme le montant),
// risque d'erreur plus faible, mais toujours motif étroit plutôt qu'un
// deviné approximatif.
const REFERENCE_REGEX = /(?:r[ée]f[ée]rence[^:\n]*:|facture\s*n[°ºo]\s*)\s*([A-Z0-9][A-Z0-9\-/]{3,})/i;

export function extractReference(text: string): string | null {
  const match = text.match(REFERENCE_REGEX);
  return match ? match[1] : null;
}
