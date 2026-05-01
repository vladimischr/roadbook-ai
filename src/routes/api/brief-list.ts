import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { withSchemaRetry } from "@/lib/supabaseRetry.server";

// ============================================================================
// /api/brief-list — liste les briefs du designer authentifié
// ============================================================================
// Renvoie aussi les réponses détaillées car la page designer doit pouvoir
// afficher le résumé d'un brief complété sans deuxième round-trip.

export const Route = createFileRoute("/api/brief-list")({
  server: {
    handlers: {
      GET: async ({ request }) => {
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

        const { data: briefs, error } = await withSchemaRetry(() =>
          supabaseAdmin
            .from("briefs")
            .select(
              "id, token, client_name, client_email, destination_hint, status, answers, roadbook_id, created_at, completed_at",
            )
            .eq("designer_id", userData.user.id)
            .order("created_at", { ascending: false }),
        );

        if (error) {
          return jsonResponse(
            { error: "Erreur DB: " + error.message },
            500,
          );
        }

        return jsonResponse({ briefs: briefs ?? [] }, 200);
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
