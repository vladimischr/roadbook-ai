import { createServerFn } from "@tanstack/react-start";

/**
 * Renvoie la clé Google Maps au client (chargée côté navigateur dans
 * <APIProvider>). La sécurité réelle vient des restrictions HTTP referrer
 * configurées dans Google Cloud Console — pas du stockage de la clé.
 */
export const getGoogleMapsApiKey = createServerFn({ method: "GET" }).handler(
  async () => {
    const key = process.env.GOOGLE_MAPS_API_KEY;
    if (!key) {
      throw new Error("GOOGLE_MAPS_API_KEY is not configured");
    }
    return { apiKey: key };
  },
);

/**
 * Géocode une chaîne de lieu en lat/lng via l'API REST Google Geocoding.
 * Appel server-side pour éviter d'exposer la clé pour des opérations en masse
 * et profiter d'une réponse stable. Retourne null si rien de pertinent.
 */
export const geocodePlace = createServerFn({ method: "POST" })
  .inputValidator((input: { query: string; region?: string }) => {
    if (!input || typeof input.query !== "string" || !input.query.trim()) {
      throw new Error("query is required");
    }
    return {
      query: input.query.trim().slice(0, 250),
      region: input.region?.trim().slice(0, 120),
    };
  })
  .handler(async ({ data }) => {
    const key = process.env.GOOGLE_MAPS_API_KEY;
    if (!key) throw new Error("GOOGLE_MAPS_API_KEY is not configured");

    const q = data.region ? `${data.query}, ${data.region}` : data.query;
    const url = new URL("https://maps.googleapis.com/maps/api/geocode/json");
    url.searchParams.set("address", q);
    url.searchParams.set("key", key);
    url.searchParams.set("language", "fr");

    try {
      const res = await fetch(url.toString());
      if (!res.ok) {
        console.error("Geocode HTTP error", res.status);
        return { lat: null, lng: null, formatted: null };
      }
      const json = (await res.json()) as {
        status: string;
        results?: Array<{
          geometry?: { location?: { lat: number; lng: number } };
          formatted_address?: string;
        }>;
      };
      if (json.status !== "OK" || !json.results?.length) {
        return { lat: null, lng: null, formatted: null };
      }
      const r = json.results[0];
      const loc = r.geometry?.location;
      if (!loc) return { lat: null, lng: null, formatted: null };
      return {
        lat: loc.lat,
        lng: loc.lng,
        formatted: r.formatted_address ?? null,
      };
    } catch (err) {
      console.error("Geocode failed:", err);
      return { lat: null, lng: null, formatted: null };
    }
  });
