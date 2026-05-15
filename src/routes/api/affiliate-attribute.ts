import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { supabaseAdmin as _supabaseAdmin } from "@/integrations/supabase/client.server";

// Cast `any` : tables affiliates non encore dans les types générés.
const supabaseAdmin = _supabaseAdmin as any;

// ============================================================================
// /api/affiliate-attribute — attache un code d'affilié à un nouveau user
// ============================================================================
// Appelé juste après un signup réussi côté client. Le client lit le cookie
// rb_ref (set par captureRefFromUrl), envoie le code + son bearer token, et
// le serveur :
//  1. Valide la session (bearer token Supabase)
//  2. Valide que le code existe et est 'active'
//  3. Empêche un user de se référer lui-même (anti-fraude)
//  4. Met à jour profiles.referred_by_code + referred_at
//
// Idempotent : si le profil a déjà un referred_by_code, on ne le change pas
// (first-touch attribution au niveau du profil ; last-touch reste valable au
// niveau du cookie, jusqu'à l'attribution).

const inputSchema = z.object({
  code: z.string().trim().min(3).max(32),
});

export const Route = createFileRoute("/api/affiliate-attribute")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
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
          const user = userData.user;

          const body = await request.json().catch(() => null);
          const parsed = inputSchema.safeParse(body);
          if (!parsed.success) {
            return jsonResponse({ error: "Payload invalide" }, 400);
          }
          const code = parsed.data.code.toUpperCase();

          // 1. Valider l'existence + statut du code
          const { data: affiliate } = await supabaseAdmin
            .from("affiliates")
            .select("code, status, user_id, email")
            .eq("code", code)
            .maybeSingle();

          if (!affiliate) {
            return jsonResponse(
              { error: "Code introuvable.", silent: true },
              200,
            );
          }
          if (affiliate.status !== "active") {
            return jsonResponse(
              { error: "Code inactif.", silent: true },
              200,
            );
          }

          // 2. Anti-self-referral : un affilié ne peut pas se parrainer
          // lui-même (par user_id OU par email).
          if (
            affiliate.user_id === user.id ||
            (affiliate.email && affiliate.email === user.email)
          ) {
            return jsonResponse(
              { error: "Auto-parrainage refusé.", silent: true },
              200,
            );
          }

          // 3. Idempotence : si déjà attribué, on n'écrase pas
          const { data: profile } = await supabaseAdmin
            .from("profiles")
            .select("referred_by_code")
            .eq("id", user.id)
            .maybeSingle();

          if (profile?.referred_by_code) {
            return jsonResponse(
              {
                message: "Déjà attribué",
                code: profile.referred_by_code,
                already_attributed: true,
              },
              200,
            );
          }

          // 4. Update
          const { error: updateErr } = await supabaseAdmin
            .from("profiles")
            .update({
              referred_by_code: code,
              referred_at: new Date().toISOString(),
            })
            .eq("id", user.id);

          if (updateErr) {
            console.error("[affiliate-attribute] update error:", updateErr);
            return jsonResponse({ error: updateErr.message }, 500);
          }

          return jsonResponse(
            { message: "Attribution enregistrée", code },
            200,
          );
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          console.error("[affiliate-attribute] error:", msg);
          return jsonResponse({ error: msg }, 500);
        }
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
