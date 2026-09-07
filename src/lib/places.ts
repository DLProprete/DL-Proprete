export type PlaceSuggestion = { placeId: string; label: string };
export type PlaceAddress = { address: string; city: string; postalCode: string };

type AutocompleteResponse = {
  suggestions?: {
    placePrediction?: { placeId?: string; text?: { text?: string } };
  }[];
};

type AddressComponent = { longText?: string; types?: string[] };
type PlaceDetailsResponse = { addressComponents?: AddressComponent[] };

// Fonction pure, testée directement : interprète la réponse Places
// Autocomplete (New) (voir src/lib/geocoding.ts pour la même convention).
export function parseAutocompleteResponse(json: unknown): PlaceSuggestion[] {
  const data = json as AutocompleteResponse;
  if (!Array.isArray(data?.suggestions)) return [];
  return data.suggestions
    .map((suggestion) => ({
      placeId: suggestion.placePrediction?.placeId,
      label: suggestion.placePrediction?.text?.text,
    }))
    .filter((s): s is PlaceSuggestion => Boolean(s.placeId && s.label));
}

// Reconstitue address/city/postalCode depuis les addressComponents de la
// réponse Place Details (New) — un composant par type (street_number,
// route, locality, postal_code), jamais garanti tous présents.
export function parseAddressComponents(json: unknown): PlaceAddress | null {
  const data = json as PlaceDetailsResponse;
  const components = data?.addressComponents;
  if (!Array.isArray(components)) return null;

  const byType = (type: string) => components.find((c) => c.types?.includes(type))?.longText;
  const streetNumber = byType("street_number");
  const route = byType("route");
  const city = byType("locality");
  const postalCode = byType("postal_code");

  const address = [streetNumber, route].filter(Boolean).join(" ");
  if (!address || !city || !postalCode) return null;
  return { address, city, postalCode };
}

// Repli silencieux ([] / null) si la clé est absente ou l'appel échoue —
// même convention que geocodeAddress (src/lib/geocoding.ts).
export async function autocompleteAddress(input: string): Promise<PlaceSuggestion[]> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey || !input.trim()) return [];

  try {
    const response = await fetch("https://places.googleapis.com/v1/places:autocomplete", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Goog-Api-Key": apiKey },
      body: JSON.stringify({ input, includedRegionCodes: ["fr"] }),
    });
    if (!response.ok) return [];
    return parseAutocompleteResponse(await response.json());
  } catch (error) {
    console.error("[places] échec de l'autocomplétion :", error);
    return [];
  }
}

export async function getPlaceAddressComponents(placeId: string): Promise<PlaceAddress | null> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey || !placeId.trim()) return null;

  try {
    const response = await fetch(`https://places.googleapis.com/v1/places/${placeId}`, {
      headers: { "X-Goog-Api-Key": apiKey, "X-Goog-FieldMask": "addressComponents" },
    });
    if (!response.ok) return null;
    return parseAddressComponents(await response.json());
  } catch (error) {
    console.error("[places] échec de la récupération du lieu :", error);
    return null;
  }
}
