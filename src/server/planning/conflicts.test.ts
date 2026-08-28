import { describe, expect, it } from "vitest";
import { timeRangesOverlap } from "./conflicts";

const t = (s: string) => new Date(s);

describe("timeRangesOverlap", () => {
  it("détecte un chevauchement partiel", () => {
    expect(
      timeRangesOverlap(
        t("2026-06-15T06:00:00Z"),
        t("2026-06-15T08:00:00Z"),
        t("2026-06-15T07:00:00Z"),
        t("2026-06-15T09:00:00Z"),
      ),
    ).toBe(true);
  });

  it("ne considère pas deux vacations qui s'enchaînent pile à l'heure comme un conflit", () => {
    expect(
      timeRangesOverlap(
        t("2026-06-15T06:00:00Z"),
        t("2026-06-15T08:00:00Z"),
        t("2026-06-15T08:00:00Z"),
        t("2026-06-15T10:00:00Z"),
      ),
    ).toBe(false);
  });

  it("ne détecte pas de conflit pour deux créneaux disjoints", () => {
    expect(
      timeRangesOverlap(
        t("2026-06-15T06:00:00Z"),
        t("2026-06-15T08:00:00Z"),
        t("2026-06-15T14:00:00Z"),
        t("2026-06-15T16:00:00Z"),
      ),
    ).toBe(false);
  });

  it("détecte un créneau entièrement contenu dans un autre", () => {
    expect(
      timeRangesOverlap(
        t("2026-06-15T06:00:00Z"),
        t("2026-06-15T14:00:00Z"),
        t("2026-06-15T08:00:00Z"),
        t("2026-06-15T09:00:00Z"),
      ),
    ).toBe(true);
  });
});
