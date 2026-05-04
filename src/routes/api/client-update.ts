import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { withSchemaRetry } from "@/lib/supabaseRetry.server";

const inputSchema = z.object({
  id: z.string().uuid(),
  display_name: z.string().min(1).max(200).optional(),
  email: z.string().email().max(200).optional().nullable(),
  phone: z.string().max(50).optional().nullable(),
  city: z.string().max(120).optional().nullable(),
  country: z.string().max(120).optional().nullable(),
  tags: z.array(z.string().max(40)).max(20).optional(),
  notes: z.string().max(5000).optional().nullable(),
  vip: z.boolean().optional(),
});

export const Route = createFileRoute("/api/client-update")({
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

        const { id, ...updates } = parsed.data;

        // Trim string fields proprement
        const patch: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(updates)) {
          if (v === undefined) continue;
          if (typeof v === "string") patch[k] = v.trim() || null;
          else patch[k] = v;
        }

        const { error } = await withSchemaRetry(() =>
          supabaseAdmin
            .from("clients")
            .update(patch as never)
            .eq("id", id)
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
