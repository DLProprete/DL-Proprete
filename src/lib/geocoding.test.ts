import { describe, expect, it } from "vitest";
import { parseGeocodingResponse } from "./geocoding";

describe("parseGeocodingResponse", () => {
  it("extrait lat/lng d'une réponse OK", () => {
    const response = {
      status: "OK",
      results: [{ geometry: { location: { lat: 49.2039, lng: -0.3086 } } }],
    };
    expect(parseGeocodingResponse(response)).toEqual({ lat: 49.2039, lng: -0.3086 });
  });

  it("retourne null pour ZERO_RESULTS", () => {
    expect(parseGeocodingResponse({ status: "ZERO_RESULTS", results: [] })).toBeNull();
  });

  it("retourne null pour une réponse malformée (pas de location)", () => {
    expect(parseGeocodingResponse({ status: "OK", results: [{ geometry: {} }] })).toBeNull();
  });

  it("retourne null pour une entrée qui n'est pas un objet exploitable", () => {
    expect(parseGeocodingResponse(null)).toBeNull();
    expect(parseGeocodingResponse(undefined)).toBeNull();
  });
});
