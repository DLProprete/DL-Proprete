import { z } from "zod";

// Réglages « Mon affichage » (page /display), propres à chaque utilisateur.
export type DisplayPrefs = {
  textSize: "NORMAL" | "LARGE" | "XLARGE";
  contrast: boolean;
  theme: "SYSTEM" | "LIGHT" | "DARK";
  reducedMotion: boolean;
  dyslexicFont: boolean;
};

export const DEFAULT_DISPLAY_PREFS: DisplayPrefs = {
  textSize: "NORMAL",
  contrast: false,
  theme: "SYSTEM",
  reducedMotion: false,
  dyslexicFont: false,
};

// Case à cocher HTML : "on" si cochée, absente sinon.
const checkbox = z.preprocess((value) => value === "on" || value === true, z.boolean());

export const displayPrefsSchema = z.object({
  textSize: z.enum(["NORMAL", "LARGE", "XLARGE"]),
  contrast: checkbox,
  theme: z.enum(["SYSTEM", "LIGHT", "DARK"]),
  reducedMotion: checkbox,
  dyslexicFont: checkbox,
});

// Attributs posés sur <html> par le layout racine ; globals.css y réagit.
export function displayAttributes(prefs: DisplayPrefs | null): Record<string, string> {
  const p = prefs ?? DEFAULT_DISPLAY_PREFS;
  return {
    "data-text": p.textSize.toLowerCase(),
    "data-theme": p.theme.toLowerCase(),
    ...(p.contrast ? { "data-contrast": "high" } : {}),
    ...(p.reducedMotion ? { "data-motion": "reduce" } : {}),
    ...(p.dyslexicFont ? { "data-font": "dyslexic" } : {}),
  };
}
