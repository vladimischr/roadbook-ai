import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

// ============================================================================
// /api/shared-roadbook?token={uuid}
// ============================================================================
// Endpoint PUBLIC (pas d'auth) qui retourne le contenu d'un roadbook
// partagé via son share_token. Utilise la RPC get_shared_roadbook qui
// filtre côté DB sur status IN ('ready', 'delivered') — les brouillons
// ne sont jamais exposés.
//
// Sécurité :
// - Token UUID (10^36 possibilités, impossible à bruteforce)
// - Status check côté DB (les brouillons restent privés)
// - Pas de user_id, pas d'agent_notes dans la réponse (RPC filtre)
// - Pas d'IPs ou d'analytics envoyés au client (uniquement le contenu)

export const Route = createFileRoute("/api/shared-roadbook")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const token = url.searchParams.get("token") || "";

        // Validation basique du format UUID (sinon Supabase RPC throw).
        if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(token)) {
          return jsonResponse(
            { error: "Token invalide" },
            { status: 400 },
          );
        }

        try {
          const { data, error } = await supabaseAdmin.rpc(
            "get_shared_roadbook",
            { p_token: token },
          );

          if (error) {
            console.error("[shared-roadbook] RPC error:", error.message);
            return jsonResponse(
              { error: "Erreur serveur" },
              { status: 500 },
            );
          }

          // RPC renvoie un tableau (RETURNS TABLE). Si vide → token invalide
          // OU roadbook en brouillon. On ne distingue pas (volontairement),
          // pour ne pas leak l'existence d'un roadbook au visiteur.
          const row = Array.isArray(data) && data.length > 0 ? data[0] : null;
          if (!row) {
            return jsonResponse(
              {
                error:
                  "Ce lien n'est pas valide, ou le voyage n'a pas encore été finalisé par l'agent.",
              },
              { status: 404 },
            );
          }

          // Cache court côté CDN (10 min). Ça évite de taper Supabase à
          // chaque rafraîchissement du visiteur, sans risquer de servir une
          // version trop périmée si l'agent met à jour.
          return new Response(JSON.stringify(row), {
            status: 200,
            headers: {
              "Content-Type": "application/json",
              "Cache-Control": "public, max-age=60, s-maxage=600",
            },
          });
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          console.error("[shared-roadbook] fatal:", msg);
          return jsonResponse({ error: msg }, { status: 500 });
        }
      },
    },
  },
});

function jsonResponse(body: unknown, init: { status: number }) {
  return new Response(JSON.stringify(body), {
    status: init.status,
    headers: { "Content-Type": "application/json" },
  });
}
