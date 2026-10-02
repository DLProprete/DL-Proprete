import { readFile } from "node:fs/promises";
import { join } from "node:path";

// Fichiers officiels de la charte (public/brand/), pour les images générées
// par next/og : on place le SVG tel quel au lieu de redessiner le logo.
export async function brandSvgDataUri(file: string): Promise<string> {
  const svg = await readFile(join(process.cwd(), "public/brand", file));
  return `data:image/svg+xml;base64,${svg.toString("base64")}`;
}
