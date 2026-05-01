import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

// ============================================================================
// /api/brief-mark-used — marque un brief comme "used" et le lie au roadbook
// ============================================================================
// Appelé après une génération réussie depuis un brief.

const inputSchema = z.object({
  brief_id: z.string().uuid(),
  roadbook_id: z.string().uuid(),
});

export const Route = createFileRoute("/api/brief-mark-used")({
  server: {
    handlers: {
      POST: async ({ request }) => {
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

        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return jsonResponse({ error: "JSON invalide." }, 400);
        }
        const parsed = inputSchema.safeParse(body);
        if (!parsed.success) {
          return jsonResponse({ error: "Données invalides" }, 400);
        }

        const { error } = await supabaseAdmin
          .from("briefs")
          .update({
            status: "used",
            roadbook_id: parsed.data.roadbook_id,
          })
          .eq("id", parsed.data.brief_id)
          .eq("designer_id", userData.user.id);

        if (error) {
          return jsonResponse(
            { error: "Erreur DB: " + error.message },
            500,
          );
        }

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
