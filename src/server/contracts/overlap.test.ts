import { describe, expect, it } from "vitest";
import { rangesOverlap } from "./overlap";

const d = (s: string) => new Date(s);

describe("rangesOverlap", () => {
  it("détecte un chevauchement partiel", () => {
    expect(rangesOverlap(d("2026-01-01"), d("2026-06-30"), d("2026-06-01"), d("2026-12-31"))).toBe(
      true,
    );
  });

  it("détecte une plage entièrement contenue dans une autre", () => {
    expect(rangesOverlap(d("2026-01-01"), d("2026-12-31"), d("2026-03-01"), d("2026-04-01"))).toBe(
      true,
    );
  });

  it("détecte un chevauchement d'un seul jour (bornes touchantes)", () => {
    expect(rangesOverlap(d("2026-01-01"), d("2026-06-30"), d("2026-06-30"), d("2026-12-31"))).toBe(
      true,
    );
  });

  it("ne détecte pas de chevauchement pour deux plages disjointes", () => {
    expect(rangesOverlap(d("2026-01-01"), d("2026-06-30"), d("2026-07-01"), d("2026-12-31"))).toBe(
      false,
    );
  });

  it("est symétrique (ordre des plages sans importance)", () => {
    expect(rangesOverlap(d("2026-07-01"), d("2026-12-31"), d("2026-01-01"), d("2026-06-30"))).toBe(
      false,
    );
  });
});
