import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

// ============================================================================
// /api/pexels-search?q={query}
// ============================================================================
// Recherche multi-photos sur Pexels (vs /api/destination-cover qui retourne
// 1 seule photo paysage). Utilisé par le photo picker dans l'éditeur de
// roadbook : l'agent tape "Sossusvlei" → on retourne 12 photos parmi
// lesquelles il choisit.

interface PexelsPhoto {
  id: number;
  src: {
    landscape: string;
    large2x: string;
    large: string;
    medium: string;
    small: string;
  };
  alt: string;
  photographer: string;
  url: string;
  width: number;
  height: number;
}

interface PexelsResponse {
  photos: PexelsPhoto[];
}

export const Route = createFileRoute("/api/pexels-search")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        // Auth — protège le quota Pexels
        const authHeader = request.headers.get("Authorization") || "";
        const token = authHeader.startsWith("Bearer ")
          ? authHeader.slice(7)
          : null;
        if (!token) {
          return jsonResponse({ error: "Authentification requise." }, 401);
        }
        const { data: userData, error: userErr } =
          await supabaseAdmin.auth.getUser(token);
        if (userErr || !userData?.user) {
          return jsonResponse({ error: "Session invalide." }, 401);
        }

        const url = new URL(request.url);
        const q = (url.searchParams.get("q") || "").trim();
        if (!q || q.length > 200) {
          return jsonResponse({ error: "Requête vide ou trop longue." }, 400);
        }

        const apiKey = process.env.PEXELS_API_KEY;
        if (!apiKey) {
          return jsonResponse({ photos: [] }, 200);
        }

        const apiUrl =
          "https://api.pexels.com/v1/search?per_page=12&query=" +
          encodeURIComponent(q);

        try {
          const res = await fetch(apiUrl, {
            headers: { Authorization: apiKey },
          });
          if (!res.ok) {
            console.error(
              "[pexels-search] HTTP",
              res.status,
              await res.text(),
            );
            return jsonResponse({ photos: [] }, 200);
          }
          const json = (await res.json()) as PexelsResponse;
          const photos = (json.photos || []).map((p) => ({
            id: p.id,
            // On expose plusieurs tailles — le client choisit selon usage.
            url_large: p.src.large2x || p.src.large,
            url_medium: p.src.medium,
            url_small: p.src.small,
            // Pour le PDF on préfère le format paysage si dispo (cover-friendly)
            url_landscape: p.src.landscape || p.src.large,
            alt: p.alt || q,
            photographer: p.photographer,
            credit_url: p.url,
            width: p.width,
            height: p.height,
          }));
          return jsonResponse({ photos }, 200);
        } catch (err) {
          console.error("[pexels-search] fetch failed:", err);
          return jsonResponse({ photos: [] }, 200);
        }
      },
    },
  },
});

function jsonResponse(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
