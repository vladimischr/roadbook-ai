import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { withSchemaRetry } from "@/lib/supabaseRetry.server";

const inputSchema = z.object({
  display_name: z.string().min(1).max(200),
  email: z.string().email().max(200).optional().nullable(),
  phone: z.string().max(50).optional().nullable(),
  city: z.string().max(120).optional().nullable(),
  country: z.string().max(120).optional().nullable(),
  tags: z.array(z.string().max(40)).max(20).optional(),
  notes: z.string().max(5000).optional().nullable(),
  vip: z.boolean().optional(),
});

export const Route = createFileRoute("/api/client-create")({
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
        if (!parsed.success) {
          return jsonResponse(
            { error: "Données invalides", issues: parsed.error.issues },
            400,
          );
        }

        const { data, error } = await withSchemaRetry(() =>
          supabaseAdmin
            .from("clients")
            .insert({
              user_id: userData.user.id,
              display_name: parsed.data.display_name.trim(),
              email: parsed.data.email?.trim() || null,
              phone: parsed.data.phone?.trim() || null,
              city: parsed.data.city?.trim() || null,
              country: parsed.data.country?.trim() || null,
              tags: parsed.data.tags ?? [],
              notes: parsed.data.notes?.trim() || null,
              vip: parsed.data.vip ?? false,
            })
            .select("id")
            .single(),
        );

        if (error || !data) {
          return jsonResponse(
            { error: "Erreur DB: " + (error?.message ?? "inconnue") },
            500,
          );
        }
        return jsonResponse({ id: data.id }, 200);
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
