import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin as _supabaseAdmin } from "@/integrations/supabase/client.server";

// Cast `any` : tables affiliates non encore dans les types générés.
const supabaseAdmin = _supabaseAdmin as any;

// ============================================================================
// /api/affiliate-dashboard — données du dashboard pour un affilié connecté
// ============================================================================
// Retourne :
//  - sa fiche affiliate (code, taux, statut)
//  - ses conversions (un récap par filleul)
//  - ses totaux (commissions dues / payées)
//
// Si le user n'a pas de code, on renvoie 200 avec `affiliate: null` pour que
// le front affiche un état "tu n'es pas encore affilié, candidate ici".

export const Route = createFileRoute("/api/affiliate-dashboard")({
  server: {
    handlers: {
      GET: async ({ request }) => {
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

          // 1. Affiliate row (par user_id OU par email — si l'admin a créé
          // le code avant que l'utilisateur ne s'inscrive)
          let { data: affiliate } = await supabaseAdmin
            .from("affiliates")
            .select(
              "code, status, name, email, commission_rate, commission_months, created_at, approved_at",
            )
            .or(`user_id.eq.${user.id},email.eq.${user.email}`)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          // Auto-link : si la ligne est trouvée par email mais sans user_id,
          // on la lie au compte connecté pour les RLS.
          if (affiliate && !("user_id" in affiliate)) {
            // (safety net)
          }
          // Force user_id update if email match but user_id empty
          const { data: rawForLink } = await supabaseAdmin
            .from("affiliates")
            .select("code, user_id")
            .eq("email", user.email ?? "")
            .is("user_id", null)
            .maybeSingle();
          if (rawForLink) {
            await supabaseAdmin
              .from("affiliates")
              .update({ user_id: user.id })
              .eq("code", rawForLink.code);
          }

          if (!affiliate) {
            return jsonResponse({ affiliate: null }, 200);
          }

          // 2. Conversions liées à ce code
          const { data: conversions, error: convErr } = await supabaseAdmin
            .from("affiliate_conversions")
            .select(
              "id, stripe_invoice_id, invoice_amount_cents, commission_amount_cents, commission_rate, payment_number, paid_to_affiliate, paid_at, created_at, referred_user_id",
            )
            .eq("affiliate_code", affiliate.code)
            .order("created_at", { ascending: false })
            .limit(500);

          if (convErr) throw new Error(convErr.message);

          // 3. Totaux
          let total_due_cents = 0;
          let total_paid_cents = 0;
          const referred_users = new Set<string>();
          for (const c of conversions ?? []) {
            total_due_cents += c.commission_amount_cents;
            if (c.paid_to_affiliate) total_paid_cents += c.commission_amount_cents;
            referred_users.add(c.referred_user_id);
          }

          return jsonResponse(
            {
              affiliate,
              conversions: conversions ?? [],
              totals: {
                referred_count: referred_users.size,
                total_due_cents,
                total_paid_cents,
                unpaid_cents: total_due_cents - total_paid_cents,
              },
            },
            200,
          );
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          console.error("[affiliate-dashboard] error:", msg);
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
