// OCR dans le navigateur (docs/NUMERISATION-DOCUMENTS.md) : le PDF scanné est
// rendu page par page puis lu par Tesseract sur le poste de l'utilisateur.
// Aucune limite de durée serveur, aucun service tiers — les fichiers du
// moteur sont servis depuis notre origine (scripts/copy-tesseract-assets.mjs).
import { compressImage, MAX_UPLOAD_BYTES } from "./compress-image";

const OCR_DPI = 300; // résolution conseillée pour Tesseract
const ARCHIVE_DPI = 150; // archive lisible, ~100 Ko par page
const ARCHIVE_JPEG_QUALITY = 0.6;
// En dessous, la page n'a pas de vrai calque texte : c'est un scan.
const MIN_TEXT_LAYER_CHARS = 40;

export type OcrOutput = { text: string; pageCount: number; archive: File };

type TesseractWorker = Awaited<ReturnType<(typeof import("tesseract.js"))["createWorker"]>>;
let workerPromise: Promise<TesseractWorker> | null = null;

// Un seul moteur pour tout un lot : le charger coûte quelques secondes.
function getWorker(): Promise<TesseractWorker> {
  workerPromise ??= import("tesseract.js").then(({ createWorker }) =>
    createWorker("fra", undefined, {
      workerPath: "/tesseract/worker.min.js",
      corePath: "/tesseract/core",
      langPath: "/tesseract/lang",
      // Worker chargé directement depuis notre origine (pas d'URL blob:,
      // que la CSP refuse).
      workerBlobURL: false,
    }),
  );
  return workerPromise;
}

export async function stopOcr(): Promise<void> {
  if (!workerPromise) return;
  const worker = await workerPromise;
  workerPromise = null;
  await worker.terminate();
}

export async function sha256Hex(file: Blob): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function ocrDocument(file: File, onPage?: (done: number, total: number) => void): Promise<OcrOutput> {
  if (file.type === "application/pdf") return ocrPdf(file, onPage);
  const image = await compressImage(file, "document");
  const worker = await getWorker();
  const { data } = await worker.recognize(image);
  onPage?.(1, 1);
  return { text: data.text.trim(), pageCount: 1, archive: image };
}

async function ocrPdf(file: File, onPage?: (done: number, total: number) => void): Promise<OcrOutput> {
  const [{ getDocumentProxy }, { PDFDocument }] = await Promise.all([import("unpdf"), import("pdf-lib")]);
  const pdf = await getDocumentProxy(new Uint8Array(await file.arrayBuffer()));
  const archive = await PDFDocument.create();
  const texts: string[] = [];
  let scannedPages = 0;

  for (let number = 1; number <= pdf.numPages; number++) {
    const page = await pdf.getPage(number);
    const pageSize = page.getViewport({ scale: 1 }); // en points (72 dpi)
    const canvas = document.createElement("canvas");
    const viewport = page.getViewport({ scale: OCR_DPI / 72 });
    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);
    // intent "print" : pdf.js n'attend alors pas requestAnimationFrame, gelé
    // quand l'onglet est en arrière-plan (la lecture d'un lot s'y bloquait).
    await page.render({ canvas, viewport, intent: "print" }).promise;

    const layer = await page.getTextContent();
    let text = layer.items.map((item) => ("str" in item ? item.str : "")).join(" ").trim();
    if (text.replace(/\s/g, "").length < MIN_TEXT_LAYER_CHARS) {
      scannedPages++;
      const worker = await getWorker();
      text = (await worker.recognize(canvas)).data.text.trim();
    }
    texts.push(text);

    const jpeg = await toJpeg(canvas, ARCHIVE_DPI / OCR_DPI);
    const image = await archive.embedJpg(jpeg);
    archive.addPage([pageSize.width, pageSize.height]).drawImage(image, {
      x: 0,
      y: 0,
      width: pageSize.width,
      height: pageSize.height,
    });
    page.cleanup();
    onPage?.(number, pdf.numPages);
  }

  // PDF « numérique » (texte sur toutes les pages) : on garde l'original,
  // plus net et souvent plus léger qu'une version recomposée en images.
  const keepOriginal = scannedPages === 0 && file.size <= MAX_UPLOAD_BYTES;
  const archiveFile = keepOriginal
    ? file
    : new File([new Uint8Array(await archive.save())], file.name, { type: "application/pdf" });
  return { text: texts.join("\n\n"), pageCount: pdf.numPages, archive: archiveFile };
}

async function toJpeg(source: HTMLCanvasElement, scale: number): Promise<Uint8Array> {
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(source.width * scale);
  canvas.height = Math.round(source.height * scale);
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Rendu impossible : canvas indisponible.");
  context.filter = "grayscale(1)"; // ignoré sans erreur par les navigateurs qui ne le gèrent pas
  context.drawImage(source, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", ARCHIVE_JPEG_QUALITY));
  if (!blob) throw new Error("Rendu impossible : conversion JPEG échouée.");
  return new Uint8Array(await blob.arrayBuffer());
}
