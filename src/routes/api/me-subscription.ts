import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { getUserSubscriptionInfo } from "@/lib/subscription.server";

// Endpoint utilisé par useSubscription() côté client : retourne le plan
// courant et l'usage. Re-fetché après checkout / changement de plan.

export const Route = createFileRoute("/api/me-subscription")({
  server: {
    handlers: {
      GET: async ({ request }) => {
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
          return new Response(JSON.stringify({ error: "Session invalide." }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
          });
        }

        try {
          const info = await getUserSubscriptionInfo(userData.user.id);
          return new Response(JSON.stringify(info), {
            status: 200,
            headers: {
              "Content-Type": "application/json",
              "Cache-Control": "no-store",
            },
          });
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          console.error("[me-subscription] error:", msg);
          return new Response(JSON.stringify({ error: msg }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }
      },
    },
  },
});
