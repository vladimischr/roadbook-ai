import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

interface PexelsPhoto {
  src: {
    landscape: string;
    large2x: string;
    large: string;
    medium: string;
  };
  alt: string;
  photographer: string;
  url: string;
}

interface PexelsResponse {
  photos: PexelsPhoto[];
}

export const Route = createFileRoute("/api/destination-cover")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        // Auth — protège le quota Pexels d'un usage non authentifié.
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

        const url = new URL(request.url);
        const destination = (url.searchParams.get("destination") || "").trim();
        if (!destination || destination.length > 200) {
          return new Response(
            JSON.stringify({ error: "Paramètre destination invalide." }),
            { status: 400, headers: { "Content-Type": "application/json" } },
          );
        }

        const apiKey = process.env.PEXELS_API_KEY;
        if (!apiKey) {
          return new Response(
            JSON.stringify({ url: null, alt: "", credit: "" }),
            { status: 200, headers: { "Content-Type": "application/json" } },
          );
        }

        const query = `${destination} travel landscape`;
        const apiUrl =
          "https://api.pexels.com/v1/search?per_page=5&orientation=landscape&query=" +
          encodeURIComponent(query);

        try {
          const res = await fetch(apiUrl, {
            headers: { Authorization: apiKey },
          });
          if (!res.ok) {
            console.error("[Pexels] HTTP", res.status, await res.text());
            return new Response(
              JSON.stringify({ url: null, alt: "", credit: "" }),
              { status: 200, headers: { "Content-Type": "application/json" } },
            );
          }
          const json = (await res.json()) as PexelsResponse;
          const photo = json.photos?.[0];
          if (!photo) {
            return new Response(
              JSON.stringify({ url: null, alt: "", credit: "" }),
              { status: 200, headers: { "Content-Type": "application/json" } },
            );
          }
          return new Response(
            JSON.stringify({
              url: photo.src.large2x || photo.src.landscape || photo.src.large,
              alt: photo.alt || destination,
              credit: `Photo: ${photo.photographer} / Pexels`,
            }),
            { status: 200, headers: { "Content-Type": "application/json" } },
          );
        } catch (err) {
          console.error("[Pexels] fetch failed:", err);
          return new Response(
            JSON.stringify({ url: null, alt: "", credit: "" }),
            { status: 200, headers: { "Content-Type": "application/json" } },
          );
        }
      },
    },
  },
});
