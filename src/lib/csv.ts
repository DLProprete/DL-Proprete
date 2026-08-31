// Marqueur BOM UTF-8 : sans lui, Excel (locale fr-FR) peut mal détecter
// l'encodage d'un CSV et corrompre les accents à l'ouverture.
export const CSV_BOM = "﻿";

// Champ CSV échappé : entoure de guillemets si nécessaire, double les
// guillemets internes (RFC 4180).
export function csvField(value: string): string {
  if (/[";\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
