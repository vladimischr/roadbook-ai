import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

/**
 * Renvoie la clé Google Maps au client, après vérification d'une session
 * Supabase valide. La sécurité réelle de la clé reste portée par les
 * restrictions HTTP referrer + API restrictions configurées dans Google Cloud
 * Console — ce gate sert uniquement à empêcher un visiteur anonyme du site
 * (ou un bot) de récupérer la clé sans avoir au moins un compte authentifié.
 */
export const Route = createFileRoute("/api/maps-key")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const key = process.env.GOOGLE_MAPS_API_KEY;
        if (!key) {
          return new Response(
            JSON.stringify({ error: "GOOGLE_MAPS_API_KEY not configured" }),
            { status: 500, headers: { "Content-Type": "application/json" } },
          );
        }

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

        return new Response(JSON.stringify({ apiKey: key }), {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            // Pas de cache navigateur sur la clé — on veut pouvoir la
            // révoquer côté serveur en restartant.
            "Cache-Control": "no-store",
          },
        });
      },
    },
  },
});
