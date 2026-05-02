import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { withSchemaRetry } from "@/lib/supabaseRetry.server";
import { rateLimit, rateLimitedResponse } from "@/lib/rate-limit.server";

// ============================================================================
// /api/brief-submit — le client envoie ses réponses (endpoint public via token)
// ============================================================================
// Rate-limit anti-DOS : 10 soumissions/min par IP (un user normal en envoie
// une seule par brief). Le payload `answers` est borné à des types simples
// via zod, mais le rate-limit empêche un spammer de remplir la table briefs
// avec des updates massifs.

const MAX_ANSWER_STRING_LENGTH = 4000;

const inputSchema = z.object({
  token: z.string().min(16).max(64),
  answers: z.record(
    z.string().max(64),
    z.union([
      z.string().max(MAX_ANSWER_STRING_LENGTH),
      z.array(z.string().max(MAX_ANSWER_STRING_LENGTH)).max(50),
      z.number(),
      z.null(),
    ]),
  ),
});

function getClientIp(request: Request): string {
  return (
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    "unknown"
  );
}

export const Route = createFileRoute("/api/brief-submit")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const ip = getClientIp(request);
        const rl = rateLimit(`brief-submit:${ip}`, 10, 60_000);
        if (!rl.ok) return rateLimitedResponse(rl.retryAfterSec ?? 60);

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
        const { token, answers } = parsed.data;

        // Lookup pour vérifier que le brief existe et n'est pas déjà completed
        const { data: brief, error: lookupErr } = await withSchemaRetry(() =>
          supabaseAdmin
            .from("briefs")
            .select("id, status")
            .eq("token", token)
            .maybeSingle(),
        );

        if (lookupErr) {
          return jsonResponse({ error: "Erreur DB." }, 500);
        }
        if (!brief) {
          return jsonResponse({ error: "Brief introuvable." }, 404);
        }
        if ((brief as any).status === "used") {
          return jsonResponse(
            { error: "Ce brief a déjà été utilisé pour générer un roadbook." },
            409,
          );
        }

        const { error: updateErr } = await withSchemaRetry(() =>
          supabaseAdmin
            .from("briefs")
            .update({
              answers,
              status: "completed",
              completed_at: new Date().toISOString(),
            })
            .eq("id", (brief as any).id),
        );

        if (updateErr) {
          return jsonResponse(
            { error: "Erreur sauvegarde: " + updateErr.message },
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
