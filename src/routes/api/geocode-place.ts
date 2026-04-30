import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

// Schéma minimal — on borne la longueur des champs pour éviter d'envoyer
// des bodies arbitraires à Google Geocoding (et de pourrir les logs).
const inputSchema = z.object({
  query: z.string().min(1).max(250),
  region: z.string().max(120).optional(),
});

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

        for (let i = 0; i < variants.length; i++) {
          const variant = variants[i];
          const result = await tryGeocode(variant, apiKey);
          if (result) {
            return new Response(
              JSON.stringify({
                lat: result.lat,
                lng: result.lng,
                formatted: result.formatted,
                geocoded_from: variant,
                confidence: i === 0 ? "high" : "fallback",
              }),
              { status: 200, headers: { "Content-Type": "application/json" } },
            );
          }
        }

        console.warn(
          `[geocode-place] échec sur ${variants.length} variantes pour "${query}" (region: ${region ?? "—"})`,
        );
        return new Response(
          JSON.stringify({
            lat: null,
            lng: null,
            formatted: null,
            geocoded_from: null,
            confidence: null,
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      },
    },
  },
});
