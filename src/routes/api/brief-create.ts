import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { withSchemaRetry } from "@/lib/supabaseRetry.server";

// ============================================================================
// /api/brief-create — le designer crée un brief, on retourne le token public
// ============================================================================

const inputSchema = z.object({
  client_name: z.string().max(120).optional().nullable(),
  client_email: z.string().email().max(200).optional().nullable(),
  destination_hint: z.string().max(200).optional().nullable(),
  client_id: z.string().uuid().optional().nullable(),
});

export const Route = createFileRoute("/api/brief-create")({
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
          body = {};
        }
        const parsed = inputSchema.safeParse(body);
        if (!parsed.success) {
          return jsonResponse(
            { error: "Données invalides", issues: parsed.error.issues },
            400,
          );
        }

        // Token public : 24 caractères base32 lisibles, peu de collisions
        const briefToken = generateBriefToken();

        const { data, error } = await withSchemaRetry(() =>
          supabaseAdmin
            .from("briefs")
            .insert({
              token: briefToken,
              designer_id: userData.user.id,
              client_name: parsed.data.client_name ?? null,
              client_email: parsed.data.client_email ?? null,
              destination_hint: parsed.data.destination_hint ?? null,
              client_id: parsed.data.client_id ?? null,
              status: "pending",
              answers: {},
            } as any)
            .select("id, token")
            .single(),
        );

        if (error || !data) {
          return jsonResponse(
            { error: "Erreur DB: " + (error?.message ?? "inconnue") },
            500,
          );
        }

        return jsonResponse({ id: data.id, token: data.token }, 200);
      },
    },
  },
});

function generateBriefToken(): string {
  // 24 chars base32 sans confusion (0/O/I/L exclus)
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let s = "";
  const buf = new Uint8Array(24);
  crypto.getRandomValues(buf);
  for (let i = 0; i < 24; i++) {
    s += alphabet[buf[i] % alphabet.length];
  }
  return s;
}

function jsonResponse(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
