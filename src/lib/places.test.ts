import { describe, expect, it } from "vitest";
import { parseAddressComponents, parseAutocompleteResponse } from "./places";

describe("parseAutocompleteResponse", () => {
  it("extrait placeId et libellé des suggestions", () => {
    const response = {
      suggestions: [
        { placePrediction: { placeId: "abc123", text: { text: "3 rue de Verdun, Colombelles" } } },
      ],
    };
    expect(parseAutocompleteResponse(response)).toEqual([
      { placeId: "abc123", label: "3 rue de Verdun, Colombelles" },
    ]);
  });

  it("retourne un tableau vide si aucune suggestion", () => {
    expect(parseAutocompleteResponse({ suggestions: [] })).toEqual([]);
  });

  it("ignore une suggestion malformée (placeId ou texte manquant) sans planter", () => {
    const response = { suggestions: [{ placePrediction: { placeId: "abc123" } }] };
    expect(parseAutocompleteResponse(response)).toEqual([]);
  });

  it("retourne un tableau vide pour une réponse non exploitable", () => {
    expect(parseAutocompleteResponse(null)).toEqual([]);
    expect(parseAutocompleteResponse({})).toEqual([]);
  });
});

describe("parseAddressComponents", () => {
  it("reconstitue une adresse française complète", () => {
    const response = {
      addressComponents: [
        { longText: "3", types: ["street_number"] },
        { longText: "Rue de Verdun", types: ["route"] },
        { longText: "Colombelles", types: ["locality"] },
        { longText: "14460", types: ["postal_code"] },
        { longText: "France", types: ["country"] },
      ],
    };
    expect(parseAddressComponents(response)).toEqual({
      address: "3 Rue de Verdun",
      city: "Colombelles",
      postalCode: "14460",
    });
  });

  it("retourne null si un composant essentiel manque (ex. code postal)", () => {
    const response = {
      addressComponents: [
        { longText: "3", types: ["street_number"] },
        { longText: "Rue de Verdun", types: ["route"] },
        { longText: "Colombelles", types: ["locality"] },
      ],
    };
    expect(parseAddressComponents(response)).toBeNull();
  });

  it("retourne null pour une réponse non exploitable", () => {
    expect(parseAddressComponents(null)).toBeNull();
    expect(parseAddressComponents({})).toBeNull();
  });
});
