import { describe, expect, it } from "vitest";
import { DEFAULT_DISPLAY_PREFS, displayAttributes, displayPrefsSchema } from "./display-prefs";

describe("displayAttributes", () => {
  it("sans session ni réglage : texte normal seulement", () => {
    expect(displayAttributes(null)).toEqual({ "data-text": "normal", "data-theme": "system" });
    expect(displayAttributes(DEFAULT_DISPLAY_PREFS)).toEqual({ "data-text": "normal", "data-theme": "system" });
  });

  it("chaque réglage actif pose son attribut", () => {
    expect(
      displayAttributes({ textSize: "XLARGE", contrast: true, theme: "DARK", reducedMotion: true, dyslexicFont: true }),
    ).toEqual({
      "data-text": "xlarge",
      "data-theme": "dark",
      "data-contrast": "high",
      "data-motion": "reduce",
      "data-font": "dyslexic",
    });
  });
});

describe("displayPrefsSchema", () => {
  it("lit un formulaire : cases cochées « on », absentes = non", () => {
    expect(displayPrefsSchema.parse({ textSize: "LARGE", theme: "SYSTEM", contrast: "on" })).toEqual({
      textSize: "LARGE",
      contrast: true,
      theme: "SYSTEM",
      reducedMotion: false,
      dyslexicFont: false,
    });
  });

  it("refuse une valeur hors liste", () => {
    expect(displayPrefsSchema.safeParse({ textSize: "HUGE", theme: "SYSTEM" }).success).toBe(false);
    expect(displayPrefsSchema.safeParse({ textSize: "NORMAL", theme: "NEON" }).success).toBe(false);
  });
});
