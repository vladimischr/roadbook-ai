import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { withSchemaRetry } from "@/lib/supabaseRetry.server";

// ============================================================================
// /api/client-list — liste les clients du designer + compteurs roadbooks/briefs
// ============================================================================

export const Route = createFileRoute("/api/client-list")({
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

        const userId = userData.user.id;

        const { data: clients, error } = await withSchemaRetry(() =>
          supabaseAdmin
            .from("clients")
            .select(
              "id, display_name, email, phone, city, country, tags, vip, created_at, updated_at",
            )
            .eq("user_id", userId)
            .order("updated_at", { ascending: false }),
        );

        if (error) {
          return jsonResponse(
            { error: "Erreur DB: " + error.message },
            500,
          );
        }

        // Compteurs roadbooks par client_id
        const { data: rbAgg } = await withSchemaRetry(() =>
          supabaseAdmin
            .from("roadbooks")
            .select("client_id, destination, end_date, created_at")
            .eq("user_id", userId)
            .not("client_id", "is", null),
        );

        const rbCount = new Map<string, number>();
        const lastDest = new Map<string, string>();
        const lastTrip = new Map<string, string>();
        for (const r of (rbAgg ?? []) as any[]) {
          if (!r.client_id) continue;
          rbCount.set(r.client_id, (rbCount.get(r.client_id) ?? 0) + 1);
          // Dernière destination (la plus récente par created_at)
          const prev = lastTrip.get(r.client_id);
          if (!prev || r.created_at > prev) {
            lastTrip.set(r.client_id, r.created_at);
            lastDest.set(r.client_id, r.destination);
          }
        }

        const enriched = (clients ?? []).map((c: any) => ({
          ...c,
          roadbook_count: rbCount.get(c.id) ?? 0,
          last_destination: lastDest.get(c.id) ?? null,
          last_trip_at: lastTrip.get(c.id) ?? null,
        }));

        return jsonResponse({ clients: enriched }, 200);
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
