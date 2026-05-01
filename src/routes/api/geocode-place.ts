import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

// Schéma minimal — on borne la longueur des champs pour éviter d'envoyer
// des bodies arbitraires à Google Geocoding (et de pourrir les logs).
const inputSchema = z.object({
  query: z.string().min(1).max(250),
  region: z.string().max(120).optional(),
});

interface GeocodeAttempt {
  found: { lat: number; lng: number; formatted: string | null } | null;
  /** Status renvoyé par Google : OK / ZERO_RESULTS / REQUEST_DENIED / OVER_QUERY_LIMIT / etc. */
  apiStatus?: string;
  /** Message d'erreur Google si REQUEST_DENIED (clé invalide, API non activée, etc.) */
  errorMessage?: string;
}

async function tryGeocode(
  query: string,
  key: string,
): Promise<GeocodeAttempt> {
  const url = new URL("https://maps.googleapis.com/maps/api/geocode/json");
  url.searchParams.set("address", query);
  url.searchParams.set("key", key);
  url.searchParams.set("language", "fr");

  try {
    const res = await fetch(url.toString());
    if (!res.ok) {
      console.error(
        `[geocode-place] HTTP ${res.status} sur "${query}":`,
        await res.text().catch(() => "<no body>"),
      );
      return { found: null, apiStatus: `HTTP_${res.status}` };
    }
    const json = (await res.json()) as {
      status: string;
      error_message?: string;
      results?: Array<{
        geometry?: { location?: { lat: number; lng: number } };
        formatted_address?: string;
      }>;
    };
    if (json.status !== "OK" || !json.results?.length) {
      // Log explicite des erreurs Google qui nécessitent une action :
      // REQUEST_DENIED → clé invalide ou Geocoding API non activée
      // OVER_QUERY_LIMIT → quota dépassé
      // INVALID_REQUEST → format de query incorrect
      if (json.status !== "ZERO_RESULTS") {
        console.error(
          `[geocode-place] Google status=${json.status} sur "${query}": ${json.error_message ?? "(no message)"}`,
        );
      }
      return {
        found: null,
        apiStatus: json.status,
        errorMessage: json.error_message,
      };
    }
    const r = json.results[0];
    const loc = r.geometry?.location;
    if (!loc) return { found: null, apiStatus: "OK_NO_LOC" };
    return {
      found: {
        lat: loc.lat,
        lng: loc.lng,
        formatted: r.formatted_address ?? null,
      },
      apiStatus: "OK",
    };
  } catch (err) {
    console.error(
      `[geocode-place] fetch failed sur "${query}":`,
      err instanceof Error ? err.message : err,
    );
    return { found: null, apiStatus: "FETCH_ERROR" };
  }
}

function buildQueryVariants(query: string, region?: string): string[] {
  const variants = new Set<string>();
  const cleanQuery = query.trim();
  const cleanRegion = region?.trim();

  const add = (v: string | null | undefined) => {
    if (!v) return;
    const t = v.trim().replace(/\s+/g, " ");
    if (t.length >= 2 && t.length <= 250) variants.add(t);
  };

  if (cleanRegion) add(`${cleanQuery}, ${cleanRegion}`);
  add(cleanQuery);

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

  const words = cleanQuery.split(/\s+/).filter((w) => w.length >= 3);
  if (words.length >= 3) {
    const shortened = words.slice(0, 4).join(" ");
    if (cleanRegion) add(`${shortened}, ${cleanRegion}`);
    add(shortened);
  }

  if (cleanRegion) add(cleanRegion);

  return [...variants];
}

export const Route = createFileRoute("/api/geocode-place")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apiKey = process.env.GOOGLE_MAPS_API_KEY;
        if (!apiKey) {
          return new Response(
            JSON.stringify({ error: "GOOGLE_MAPS_API_KEY non configurée" }),
            { status: 500, headers: { "Content-Type": "application/json" } },
          );
        }

        // Auth — protège le quota Google Geocoding d'un usage non authentifié.
        const authHeader = request.headers.get("Authorization") || "";
        const token = authHeader.startsWith("Bearer ")
          ? authHeader.slice(7)
          : null;
        if (!token) {
          return new Response(
            JSON.stringify({ error: "Authentification requise." }),
            { status: 401, headers: { "Content-Type": "application/json" } },
          );
        }
        const { data: userData, error: userErr } =
          await supabaseAdmin.auth.getUser(token);
        if (userErr || !userData?.user) {
          return new Response(
            JSON.stringify({ error: "Session invalide." }),
            { status: 401, headers: { "Content-Type": "application/json" } },
          );
        }

        const rawBody = await request.json().catch(() => null);
        const parsed = inputSchema.safeParse(rawBody);
        if (!parsed.success) {
          return new Response(
            JSON.stringify({
              error: "Payload invalide",
              issues: parsed.error.issues,
            }),
            { status: 400, headers: { "Content-Type": "application/json" } },
          );
        }

        const { query, region } = parsed.data;
        const variants = buildQueryVariants(query, region);

        let lastApiStatus: string | undefined;
        let lastErrorMessage: string | undefined;

        for (let i = 0; i < variants.length; i++) {
          const variant = variants[i];
          const result = await tryGeocode(variant, apiKey);
          lastApiStatus = result.apiStatus;
          lastErrorMessage = result.errorMessage;

          if (result.found) {
            return new Response(
              JSON.stringify({
                lat: result.found.lat,
                lng: result.found.lng,
                formatted: result.found.formatted,
                geocoded_from: variant,
                confidence: i === 0 ? "high" : "fallback",
              }),
              { status: 200, headers: { "Content-Type": "application/json" } },
            );
          }

          // Court-circuite la boucle si Google nous dit que la clé est cassée
          // ou que le quota est saturé. Inutile de retenter 8 variantes qui
          // vont toutes échouer de la même façon — ça brûle des ms et pollue
          // les logs. On remonte l'erreur au client pour qu'il l'affiche.
          if (
            result.apiStatus === "REQUEST_DENIED" ||
            result.apiStatus === "OVER_QUERY_LIMIT" ||
            result.apiStatus === "INVALID_REQUEST"
          ) {
            return new Response(
              JSON.stringify({
                lat: null,
                lng: null,
                formatted: null,
                geocoded_from: null,
                confidence: null,
                error: `Google Maps: ${result.apiStatus}${
                  result.errorMessage ? ` — ${result.errorMessage}` : ""
                }`,
                api_status: result.apiStatus,
              }),
              {
                status: 502,
                headers: { "Content-Type": "application/json" },
              },
            );
          }
        }

        console.warn(
          `[geocode-place] échec sur ${variants.length} variantes pour "${query}" (region: ${region ?? "—"}, last_status: ${lastApiStatus ?? "?"})`,
        );
        return new Response(
          JSON.stringify({
            lat: null,
            lng: null,
            formatted: null,
            geocoded_from: null,
            confidence: null,
            api_status: lastApiStatus,
            error_message: lastErrorMessage,
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      },
    },
  },
});
