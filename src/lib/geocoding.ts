import type { Coordinates } from "./geo";

type GeocodingResponse = {
  status?: string;
  results?: { geometry?: { location?: { lat?: number; lng?: number } } }[];
};

// Fonction pure, testée directement : c'est elle qui porte la logique
// d'interprétation de la réponse Google (status OK + premier résultat).
export function parseGeocodingResponse(json: unknown): Coordinates | null {
  const data = json as GeocodingResponse;
  if (data?.status !== "OK") return null;
  const location = data.results?.[0]?.geometry?.location;
  if (typeof location?.lat !== "number" || typeof location?.lng !== "number") return null;
  return { lat: location.lat, lng: location.lng };
}

// Repli silencieux si GOOGLE_MAPS_API_KEY absente ou l'appel échoue — même
// convention que smtpTransport() dans src/lib/email.ts et
// supabaseStorage() dans src/lib/uploads.ts : une adresse enregistrée sans
// coordonnées n'est jamais une erreur bloquante.
export async function geocodeAddress(fullAddress: string): Promise<Coordinates | null> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey || !fullAddress.trim()) return null;

  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(fullAddress)}&key=${apiKey}`;
    const response = await fetch(url);
    if (!response.ok) return null;
    return parseGeocodingResponse(await response.json());
  } catch (error) {
    console.error("[geocoding] échec de la requête :", error);
    return null;
  }
}
