import { createServerFn } from "@tanstack/react-start";

/**
 * @deprecated Remplacé par la route `/api/maps-key` qui exige un Bearer token
 * Supabase. Conservé temporairement pour ne rien casser d'externe — supprimer
 * dans une PR suivante après vérification qu'aucun consommateur ne l'importe.
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
 * Tente un géocodage simple via l'API REST Google Geocoding.
 * Helper interne, pas exporté.
 */
async function tryGeocode(
  query: string,
  key: string,
): Promise<{ lat: number; lng: number; formatted: string | null } | null> {
  const url = new URL("https://maps.googleapis.com/maps/api/geocode/json");
  url.searchParams.set("address", query);
  url.searchParams.set("key", key);
  url.searchParams.set("language", "fr");

  try {
    const res = await fetch(url.toString());
    if (!res.ok) return null;
    const json = (await res.json()) as {
      status: string;
      results?: Array<{
        geometry?: { location?: { lat: number; lng: number } };
        formatted_address?: string;
      }>;
    };
    if (json.status !== "OK" || !json.results?.length) return null;
    const r = json.results[0];
    const loc = r.geometry?.location;
    if (!loc) return null;
    return {
      lat: loc.lat,
      lng: loc.lng,
      formatted: r.formatted_address ?? null,
    };
  } catch {
    return null;
  }
}

/**
 * Construit une liste de variantes de query par ordre de spécificité
 * décroissante. La première variante qui matche l'API gagne.
 *
 * Exemples :
 * - "Cratère du Ngorongoro" + "Tanzanie" →
 *   ["Cratère du Ngorongoro, Tanzanie", "Cratère du Ngorongoro", ...]
 * - "Sesriem - dunes du Sossusvlei" + "Namibie" →
 *   [variante complète avec région, variante seule, "Sesriem, Namibie",
 *    "dunes du Sossusvlei, Namibie", ...]
 */
function buildQueryVariants(query: string, region?: string): string[] {
  const variants = new Set<string>();
  const cleanQuery = query.trim();
  const cleanRegion = region?.trim();

  const add = (v: string | null | undefined) => {
    if (!v) return;
    const t = v.trim().replace(/\s+/g, " ");
    if (t.length >= 2 && t.length <= 250) variants.add(t);
  };

  // 1. Query complète + région (la plus spécifique)
  if (cleanRegion) add(`${cleanQuery}, ${cleanRegion}`);
  // 2. Query seule
  add(cleanQuery);

  // 3. Si la query contient un séparateur (- — – : | →), tenter chaque morceau + région
  const parts = cleanQuery
    .split(/\s*[-—–:|→]\s*/)
    .map((p) => p.trim())
    .filter((p) => p.length >= 2);
  if (parts.length > 1) {
    for (const part of parts) {
      if (cleanRegion) add(`${part}, ${cleanRegion}`);
      add(part);
    }
  }

  // 4. Nettoyer les préfixes parasites courants en français
  const stripped = cleanQuery
    .replace(
      /^(h[ée]bergement\s+(?:à|au|aux|en|de|du)\s+|camp\s+(?:de\s+tentes?\s+)?|lodge\s+|hôtel\s+|hotel\s+|guesthouse\s+|appartement\s+(?:à|au|aux|de|du)\s+)/i,
      "",
    )
    .trim();
  if (stripped !== cleanQuery && stripped.length >= 2) {
    if (cleanRegion) add(`${stripped}, ${cleanRegion}`);
    add(stripped);
  }

  // 5. Si encore rien, prendre les 3-4 premiers mots significatifs (souvent
  // suffisant : "Camp de tentes Serengeti Kati Kati" → "Camp Serengeti")
  const words = cleanQuery.split(/\s+/).filter((w) => w.length >= 3);
  if (words.length >= 3) {
    const shortened = words.slice(0, 4).join(" ");
    if (cleanRegion) add(`${shortened}, ${cleanRegion}`);
    add(shortened);
  }

  // 6. Fallback ultime : juste la région principale (place le marker
  // sur la destination si rien d'autre ne marche — mieux que rien)
  if (cleanRegion) add(cleanRegion);

  return [...variants];
}

/**
 * Géocode une chaîne de lieu en lat/lng via l'API REST Google Geocoding.
 *
 * Stratégie progressive : tente plusieurs variantes du nom (avec/sans
 * région, morceaux séparés, mots simplifiés) jusqu'à ce qu'une réponde.
 * Retourne aussi `geocoded_from` (la variante qui a matché) pour
 * permettre au client de signaler les géocodages "fallback".
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

    const variants = buildQueryVariants(data.query, data.region);

    for (let i = 0; i < variants.length; i++) {
      const variant = variants[i];
      const result = await tryGeocode(variant, key);
      if (result) {
        return {
          lat: result.lat,
          lng: result.lng,
          formatted: result.formatted,
          geocoded_from: variant,
          confidence: i === 0 ? ("high" as const) : ("fallback" as const),
        };
      }
    }

    console.warn(
      `Geocode failed for all ${variants.length} variants of "${data.query}" (region: ${data.region ?? "none"})`,
    );
    return {
      lat: null,
      lng: null,
      formatted: null,
      geocoded_from: null,
      confidence: null,
    };
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
