// Copie les fichiers de Tesseract dans public/tesseract/ pour l'OCR dans le
// navigateur (src/lib/browser-ocr.ts) : auto-hébergés plutôt que chargés
// depuis le CDN par défaut de tesseract.js (aucun service tiers, CSP
// limitée à notre origine). Lancé avant `dev` et `build`.
import { copyFile, mkdir } from "node:fs/promises";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const out = path.join(root, "public", "tesseract");

const files = [
  ["node_modules/tesseract.js/dist/worker.min.js", "worker.min.js"],
  // Mode LSTM seul (défaut) : tesseract.js choisit l'une de ces trois
  // variantes selon le support SIMD du navigateur.
  ["node_modules/tesseract.js-core/tesseract-core-lstm.wasm.js", "core/tesseract-core-lstm.wasm.js"],
  ["node_modules/tesseract.js-core/tesseract-core-simd-lstm.wasm.js", "core/tesseract-core-simd-lstm.wasm.js"],
  ["node_modules/tesseract.js-core/tesseract-core-relaxedsimd-lstm.wasm.js", "core/tesseract-core-relaxedsimd-lstm.wasm.js"],
  ["assets/tessdata/fra.traineddata.gz", "lang/fra.traineddata.gz"],
];

for (const [from, to] of files) {
  const target = path.join(out, to);
  await mkdir(path.dirname(target), { recursive: true });
  await copyFile(path.join(root, from), target);
}
console.log(`[tesseract] ${files.length} fichiers copiés dans public/tesseract/`);
