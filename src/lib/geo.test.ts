import { describe, expect, it } from "vitest";
import { haversineKm } from "./geo";

describe("haversineKm", () => {
  it("vaut 0 pour deux points identiques", () => {
    expect(haversineKm({ lat: 49.1829, lng: -0.3707 }, { lat: 49.1829, lng: -0.3707 })).toBe(0);
  });

  it("est symétrique", () => {
    const caen = { lat: 49.1829, lng: -0.3707 };
    const colombelles = { lat: 49.2039, lng: -0.3086 };
    expect(haversineKm(caen, colombelles)).toBeCloseTo(haversineKm(colombelles, caen), 6);
  });

  it("donne une distance cohérente entre Caen et Colombelles (~5 km à vol d'oiseau)", () => {
    const caen = { lat: 49.1829, lng: -0.3707 };
    const colombelles = { lat: 49.2039, lng: -0.3086 };
    const distance = haversineKm(caen, colombelles);
    expect(distance).toBeGreaterThan(3);
    expect(distance).toBeLessThan(8);
  });
});
