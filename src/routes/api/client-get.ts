import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { withSchemaRetry } from "@/lib/supabaseRetry.server";

// ============================================================================
// /api/client-get?id=XXX — détail d'un client + timeline (roadbooks + briefs)
// ============================================================================

export const Route = createFileRoute("/api/client-get")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const authHeader = request.headers.get("Authorization") || "";
        const token = authHeader.startsWith("Bearer ")
          ? authHeader.slice(7)
          : null;
        if (!token) return jsonResponse({ error: "Auth requise." }, 401);
        const { data: userData, error: userErr } =
          await supabaseAdmin.auth.getUser(token);
        if (userErr || !userData?.user)
          return jsonResponse({ error: "Session invalide." }, 401);

        const url = new URL(request.url);
        const clientId = url.searchParams.get("id");
        if (!clientId) return jsonResponse({ error: "id requis." }, 400);

        const userId = userData.user.id;

        const { data: client, error } = await withSchemaRetry(() =>
          supabaseAdmin
            .from("clients")
            .select("*")
            .eq("id", clientId)
            .eq("user_id", userId)
            .maybeSingle(),
        );

        if (error)
          return jsonResponse({ error: "Erreur DB: " + error.message }, 500);
        if (!client)
          return jsonResponse({ error: "Client introuvable." }, 404);

        const [{ data: roadbooks }, { data: briefs }] = await Promise.all([
          withSchemaRetry(() =>
            supabaseAdmin
              .from("roadbooks")
              .select(
                "id, destination, client_name, start_date, end_date, status, created_at, theme",
              )
              .eq("client_id", clientId)
              .eq("user_id", userId)
              .order("created_at", { ascending: false }),
          ),
          withSchemaRetry(() =>
            supabaseAdmin
              .from("briefs")
              .select(
                "id, token, destination_hint, status, created_at, completed_at, roadbook_id",
              )
              .eq("client_id", clientId)
              .eq("designer_id", userId)
              .order("created_at", { ascending: false }),
          ),
        ]);

        return jsonResponse(
          {
            client,
            roadbooks: roadbooks ?? [],
            briefs: briefs ?? [],
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
