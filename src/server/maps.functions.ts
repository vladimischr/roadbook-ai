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

/**
 * Récupère un tracé routier réel entre deux points via Google Directions API.
 * Retourne la polyline encodée + distance/durée. Fallback ligne droite si
 * Directions échoue (ex: lieu non routable, traversée maritime sans ferry).
 *
 * Le mode est forcé à DRIVING — l'aérien est traité côté client en pointillé
 * droit séparément.
 */
export const getDirectionsSegment = createServerFn({ method: "POST" })
  .inputValidator(
    (input: {
      from: { lat: number; lng: number };
      to: { lat: number; lng: number };
    }) => {
      const num = (n: unknown): n is number =>
        typeof n === "number" && Number.isFinite(n);
      if (
        !input ||
        !input.from ||
        !input.to ||
        !num(input.from.lat) ||
        !num(input.from.lng) ||
        !num(input.to.lat) ||
        !num(input.to.lng)
      ) {
        throw new Error("from/to lat/lng required");
      }
      return input;
    },
  )
  .handler(async ({ data }) => {
    const key = process.env.GOOGLE_MAPS_API_KEY;
    if (!key) throw new Error("GOOGLE_MAPS_API_KEY is not configured");

    const url = new URL(
      "https://maps.googleapis.com/maps/api/directions/json",
    );
    url.searchParams.set("origin", `${data.from.lat},${data.from.lng}`);
    url.searchParams.set("destination", `${data.to.lat},${data.to.lng}`);
    url.searchParams.set("mode", "driving");
    url.searchParams.set("language", "fr");
    url.searchParams.set("key", key);

    try {
      const res = await fetch(url.toString());
      if (!res.ok) {
        console.error("Directions HTTP error", res.status);
        return {
          ok: false as const,
          encoded_polyline: null,
          distance_meters: null,
          duration_seconds: null,
        };
      }
      const json = (await res.json()) as {
        status: string;
        routes?: Array<{
          overview_polyline?: { points?: string };
          legs?: Array<{
            distance?: { value?: number };
            duration?: { value?: number };
          }>;
        }>;
      };
      if (json.status !== "OK" || !json.routes?.length) {
        return {
          ok: false as const,
          encoded_polyline: null,
          distance_meters: null,
          duration_seconds: null,
          status: json.status,
        };
      }
      const route = json.routes[0];
      const encoded = route.overview_polyline?.points ?? null;
      const totalDist =
        route.legs?.reduce(
          (acc, l) => acc + (l.distance?.value ?? 0),
          0,
        ) ?? null;
      const totalDur =
        route.legs?.reduce(
          (acc, l) => acc + (l.duration?.value ?? 0),
          0,
        ) ?? null;
      return {
        ok: true as const,
        encoded_polyline: encoded,
        distance_meters: totalDist,
        duration_seconds: totalDur,
      };
    } catch (err) {
      console.error("Directions failed:", err);
      return {
        ok: false as const,
        encoded_polyline: null,
        distance_meters: null,
        duration_seconds: null,
      };
    }
  });
