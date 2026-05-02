import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { withSchemaRetry } from "@/lib/supabaseRetry.server";

const inputSchema = z.object({ id: z.string().uuid() });

export const Route = createFileRoute("/api/client-delete")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const authHeader = request.headers.get("Authorization") || "";
        const token = authHeader.startsWith("Bearer ")
          ? authHeader.slice(7)
          : null;
        if (!token) return jsonResponse({ error: "Auth requise." }, 401);
        const { data: userData, error: userErr } =
          await supabaseAdmin.auth.getUser(token);
        if (userErr || !userData?.user)
          return jsonResponse({ error: "Session invalide." }, 401);

        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return jsonResponse({ error: "JSON invalide." }, 400);
        }
        const parsed = inputSchema.safeParse(body);
        if (!parsed.success)
          return jsonResponse({ error: "Données invalides" }, 400);

        // Les FK sur roadbooks/briefs sont ON DELETE SET NULL → les
        // roadbooks restent, juste détachés.
        const { error } = await withSchemaRetry(() =>
          supabaseAdmin
            .from("clients")
            .delete()
            .eq("id", parsed.data.id)
            .eq("user_id", userData.user.id),
        );

        if (error)
          return jsonResponse({ error: "Erreur DB: " + error.message }, 500);
        return jsonResponse({ ok: true }, 200);
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
