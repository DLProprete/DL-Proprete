import { describe, expect, it } from "vitest";
import { base32Decode, base32Encode, generateTotpSecret, otpauthUri, stepAt, totpCode, verifyTotp } from "./totp";

// Secret de test de la RFC 6238 (annexe B) : ASCII "12345678901234567890".
const RFC_SECRET = base32Encode(Buffer.from("12345678901234567890"));

describe("TOTP (RFC 6238)", () => {
  it("retrouve les vecteurs officiels (SHA-1, 8 chiffres)", () => {
    expect(totpCode(RFC_SECRET, stepAt(new Date(59 * 1000)), 8)).toBe("94287082");
    expect(totpCode(RFC_SECRET, stepAt(new Date(1111111109 * 1000)), 8)).toBe("07081804");
    expect(totpCode(RFC_SECRET, stepAt(new Date(1234567890 * 1000)), 8)).toBe("89005924");
    expect(totpCode(RFC_SECRET, stepAt(new Date(2000000000 * 1000)), 8)).toBe("69279037");
  });

  it("base32 aller-retour", () => {
    const secret = generateTotpSecret();
    expect(secret).toMatch(/^[A-Z2-7]{32}$/);
    expect(base32Encode(base32Decode(secret))).toBe(secret);
  });

  it("accepte le code courant et celui du pas voisin, refuse au-delà", () => {
    const secret = generateTotpSecret();
    const now = new Date("2026-10-03T12:00:10Z");
    const step = stepAt(now);
    expect(verifyTotp(secret, totpCode(secret, step), now)).toBe(step);
    expect(verifyTotp(secret, totpCode(secret, step - 1), now)).toBe(step - 1);
    expect(verifyTotp(secret, totpCode(secret, step - 3), now)).toBeNull();
    expect(verifyTotp(secret, "12345", now)).toBeNull();
    expect(verifyTotp(secret, "abcdef", now)).toBeNull();
  });

  it("refuse de rejouer un code déjà utilisé", () => {
    const secret = generateTotpSecret();
    const now = new Date("2026-10-03T12:00:10Z");
    const step = stepAt(now);
    expect(verifyTotp(secret, totpCode(secret, step), now, step)).toBeNull();
  });

  it("construit un lien otpauth avec émetteur et secret", () => {
    const uri = otpauthUri("cassandre@dlproprete.fr", "ABCDEF");
    expect(uri.startsWith("otpauth://totp/DL%20Propret%C3%A9%3Acassandre%40dlproprete.fr?")).toBe(true);
    expect(uri).toContain("secret=ABCDEF");
  });
});
