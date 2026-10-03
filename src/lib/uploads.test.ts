import { describe, expect, it } from "vitest";
import { hasExpectedSignature } from "./uploads";

const bytes = (...values: number[]) => Uint8Array.from(values);

describe("hasExpectedSignature", () => {
  it("accepte un PDF, un JPEG et un PNG authentiques", () => {
    expect(hasExpectedSignature(Buffer.from("%PDF-1.7\n…"), "pdf")).toBe(true);
    expect(hasExpectedSignature(bytes(0xff, 0xd8, 0xff, 0xe0, 0x00), "jpg")).toBe(true);
    expect(hasExpectedSignature(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00), "png")).toBe(true);
  });

  it("refuse un fichier dont le contenu ne correspond pas au type annoncé", () => {
    expect(hasExpectedSignature(Buffer.from("<html><script>alert(1)</script>"), "png")).toBe(false);
    expect(hasExpectedSignature(Buffer.from("%PDF-1.7"), "jpg")).toBe(false);
    expect(hasExpectedSignature(bytes(0xff, 0xd8), "jpg")).toBe(false);
  });

  it("refuse une extension inconnue", () => {
    expect(hasExpectedSignature(Buffer.from("%PDF-1.7"), "docx")).toBe(false);
  });
});
