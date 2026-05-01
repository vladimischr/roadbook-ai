import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

// ============================================================================
// /api/brief-get-public?token=XXX — endpoint public pour la page formulaire
// ============================================================================
// Retourne juste les infos affichables (nom du designer, agence, hint dest).
// Pas de policy RLS, donc on passe par supabaseAdmin et on filtre nous-même.

export const Route = createFileRoute("/api/brief-get-public")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const token = url.searchParams.get("token");
        if (!token || token.length < 16 || token.length > 64) {
          return jsonResponse({ error: "Token invalide." }, 400);
        }

        const { data: brief, error } = await supabaseAdmin
          .from("briefs")
          .select(
            "id, status, client_name, destination_hint, designer_id, completed_at",
          )
          .eq("token", token)
          .maybeSingle();

        if (error) {
          return jsonResponse({ error: "Erreur DB." }, 500);
        }
        if (!brief) {
          return jsonResponse({ error: "Brief introuvable." }, 404);
        }

        // Récupère le profil du designer (nom, agence, branding)
        const { data: profile } = await supabaseAdmin
          .from("profiles")
          .select("display_name, agency_name, agency_logo_url, brand_color")
          .eq("id", (brief as any).designer_id)
          .maybeSingle();

        return jsonResponse(
          {
            status: (brief as any).status,
            client_name: (brief as any).client_name,
            destination_hint: (brief as any).destination_hint,
            completed_at: (brief as any).completed_at,
            designer: {
              display_name: (profile as any)?.display_name ?? null,
              agency_name: (profile as any)?.agency_name ?? null,
              agency_logo_url: (profile as any)?.agency_logo_url ?? null,
              brand_color: (profile as any)?.brand_color ?? null,
            },
          },
          200,
        );
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
