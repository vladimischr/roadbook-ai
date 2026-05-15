import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin as _supabaseAdmin } from "@/integrations/supabase/client.server";

// Cast `any` : tables affiliates non encore dans les types générés.
const supabaseAdmin = _supabaseAdmin as any;

// ============================================================================
// /api/affiliate-self-enroll — auto-inscription au programme d'affiliation
// ============================================================================
// Tout user connecté peut générer son code en 1 clic depuis /affiliate.
// Pas de validation admin, code actif immédiatement, taux 30% / 12 mois.
//
// Idempotent : si l'user a déjà un code (par user_id OU par email), on
// renvoie son code existant sans le modifier.
//
// Le code est généré à partir du display_name OU agency_name OU email-avant-@,
// nettoyé pour respecter le pattern [A-Z0-9_-]{3,32}. En cas de collision,
// on append un suffixe random 4 chars.

const DEFAULT_RATE = 30;
const DEFAULT_MONTHS = 12;
const MAX_SLUG_BASE_LEN = 12;
const MAX_RETRIES = 5;

function cleanSlug(raw: string): string {
  return raw
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, MAX_SLUG_BASE_LEN);
}

function randomSuffix(): string {
  return Math.random().toString(36).slice(2, 6).toUpperCase();
}

export const Route = createFileRoute("/api/affiliate-self-enroll")({
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

          // 1. Idempotence : si user déjà affilié, on renvoie son code
          const { data: existing } = await supabaseAdmin
            .from("affiliates")
            .select("code, status, user_id, email")
            .or(`user_id.eq.${user.id},email.eq.${user.email ?? ""}`)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          if (existing) {
            // Link user_id si trouvé par email seulement
            if (!existing.user_id && existing.email === user.email) {
              await supabaseAdmin
                .from("affiliates")
                .update({ user_id: user.id })
                .eq("code", existing.code);
            }
            return jsonResponse(
              {
                code: existing.code,
                status: existing.status,
                already_enrolled: true,
              },
              200,
            );
          }

          // 2. Récupère le profil pour le slug
          const { data: profile } = await supabaseAdmin
            .from("profiles")
            .select("display_name, agency_name, email")
            .eq("id", user.id)
            .maybeSingle();

          const emailBase = (user.email ?? profile?.email ?? "user")
            .split("@")[0];

          // Préfère display_name → agency_name → email-avant-@
          const rawBase =
            (profile?.display_name as string | null) ||
            (profile?.agency_name as string | null) ||
            emailBase ||
            "USER";

          let base = cleanSlug(rawBase);
          if (base.length < 3) {
            // Fallback : "USER" + random suffix
            base = "USER";
          }

          // 3. Tenter d'insérer avec un slug propre, retry avec suffix random
          // si conflict PK.
          let code = base;
          let inserted = false;
          let lastErr: unknown = null;

          for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
            const candidate =
              attempt === 0 ? base : `${base}-${randomSuffix()}`;

            const { error } = await supabaseAdmin
              .from("affiliates")
              .insert({
                code: candidate,
                user_id: user.id,
                name:
                  (profile?.display_name as string | null) ||
                  (profile?.agency_name as string | null) ||
                  (user.email ?? "Affilié"),
                email: user.email ?? profile?.email ?? "unknown",
                status: "active",
                commission_rate: DEFAULT_RATE,
                commission_months: DEFAULT_MONTHS,
                approved_at: new Date().toISOString(),
                approved_by: user.id, // self-approve flag
                notes: "Auto-enrolled via /affiliate",
              });

            if (!error) {
              code = candidate;
              inserted = true;
              break;
            }

            // Code 23505 = unique violation → on retry avec suffix
            const isDup =
              (error as { code?: string }).code === "23505" ||
              /duplicate key/i.test(error.message ?? "");
            if (!isDup) {
              lastErr = error;
              break;
            }
            // sinon on retry au tour suivant
          }

          if (!inserted) {
            console.error(
              "[affiliate-self-enroll] insert failed after retries:",
              lastErr,
            );
            return jsonResponse(
              {
                error:
                  "Impossible de générer un code. Réessaie ou contacte le support.",
              },
              500,
            );
          }

          return jsonResponse(
            { code, status: "active", already_enrolled: false },
            200,
          );
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          console.error("[affiliate-self-enroll] error:", msg);
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
