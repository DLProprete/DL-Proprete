// Marqueur BOM UTF-8 : sans lui, Excel (locale fr-FR) peut mal détecter
// l'encodage d'un CSV et corrompre les accents à l'ouverture.
export const CSV_BOM = "﻿";

// Un champ commençant par = + - @ est interprété comme une formule par
// Excel/LibreOffice à l'ouverture (injection de formule) : neutralisé par
// une apostrophe de tête, invisible une fois le fichier ouvert.
const FORMULA_PREFIX = /^[=+\-@]/;

// Champ CSV échappé : entoure de guillemets si nécessaire, double les
// guillemets internes (RFC 4180).
export function csvField(value: string): string {
  const safe = FORMULA_PREFIX.test(value) ? `'${value}` : value;
  if (/[";\n]/.test(safe)) {
    return `"${safe.replace(/"/g, '""')}"`;
  }
  return safe;
}
