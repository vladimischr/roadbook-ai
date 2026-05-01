import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

// ============================================================================
// /api/admin-users — endpoint protégé par ADMIN_EMAILS
// ============================================================================
// Retourne la liste de tous les utilisateurs avec leur plan, statut, dates
// d'inscription et compteurs d'usage. Réservé aux admins définis dans
// l'env var ADMIN_EMAILS (liste séparée par virgules).

function isAdmin(email: string | undefined | null): boolean {
  if (!email) return false;
  const list = (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  if (list.length === 0) return false;
  return list.includes(email.toLowerCase());
}

export const Route = createFileRoute("/api/admin-users")({
  server: {
    handlers: {
      GET: async ({ request }) => {
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
        if (!isAdmin(userData.user.email)) {
          return jsonResponse({ error: "Accès admin requis." }, 403);
        }

        try {
          // 1. Tous les profils
          const { data: profiles, error: profErr } = await supabaseAdmin
            .from("profiles")
            .select(
              "id, email, display_name, agency_name, plan_key, plan_status, current_period_end, trial_ends_at, created_at",
            )
            .order("created_at", { ascending: false });
          if (profErr) {
            return jsonResponse(
              { error: "Erreur DB profils: " + profErr.message },
              500,
            );
          }

          // 2. Compteur de roadbooks par user (LEFT JOIN agrégé)
          const { data: roadbooksCount } = await supabaseAdmin
            .from("roadbooks")
            .select("user_id");
          const rbCountByUser = new Map<string, number>();
          for (const r of roadbooksCount ?? []) {
            const uid = (r as any).user_id;
            rbCountByUser.set(uid, (rbCountByUser.get(uid) ?? 0) + 1);
          }

          // 3. Compteur d'actions IA par user (sur 30 derniers jours)
          const thirtyDaysAgo = new Date(
            Date.now() - 30 * 24 * 60 * 60 * 1000,
          ).toISOString();
          const { data: aiActions } = await supabaseAdmin
            .from("ai_actions")
            .select("user_id, action_type")
            .gte("created_at", thirtyDaysAgo);
          const aiCountByUser = new Map<
            string,
            { generate: number; chat: number; recompute: number; import: number }
          >();
          for (const a of aiActions ?? []) {
            const uid = (a as any).user_id;
            const type = (a as any).action_type as
              | "generate"
              | "chat"
              | "recompute"
              | "import";
            const cur = aiCountByUser.get(uid) ?? {
              generate: 0,
              chat: 0,
              recompute: 0,
              import: 0,
            };
            if (type in cur) cur[type] += 1;
            aiCountByUser.set(uid, cur);
          }

          // 4. Combine
          const users = (profiles ?? []).map((p) => {
            const ai = aiCountByUser.get((p as any).id) ?? {
              generate: 0,
              chat: 0,
              recompute: 0,
              import: 0,
            };
            return {
              id: (p as any).id,
              email: (p as any).email,
              display_name: (p as any).display_name,
              agency_name: (p as any).agency_name,
              plan_key: (p as any).plan_key,
              plan_status: (p as any).plan_status,
              current_period_end: (p as any).current_period_end,
              trial_ends_at: (p as any).trial_ends_at,
              created_at: (p as any).created_at,
              roadbooks_total: rbCountByUser.get((p as any).id) ?? 0,
              ai_30d: ai,
            };
          });

          return jsonResponse({ users }, 200);
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
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
