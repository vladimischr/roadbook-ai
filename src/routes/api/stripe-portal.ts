import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { getStripe } from "@/integrations/stripe/client.server";

// ============================================================================
// Crée une session "Customer Portal" Stripe
// ============================================================================
// Le portail permet à l'utilisateur de :
// - Voir son historique de factures
// - Mettre à jour son moyen de paiement
// - Changer de plan (si on configure les "products" dans le portal Stripe)
// - Annuler son abonnement
//
// Tout est hosté par Stripe — zéro UI à coder côté nous. Le seul moyen propre
// pour gérer les paiements après checkout.

export const Route = createFileRoute("/api/stripe-portal")({
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

          const body = (await request.json().catch(() => null)) as
            | { origin?: string }
            | null;
          const origin = body?.origin;
          if (!origin || !/^https?:\/\//.test(origin)) {
            return jsonResponse({ error: "origin manquant" }, 400);
          }

          const { data: profile } = await supabaseAdmin
            .from("profiles")
            .select("stripe_customer_id")
            .eq("id", userData.user.id)
            .maybeSingle();

          if (!profile?.stripe_customer_id) {
            return jsonResponse(
              {
                error:
                  "Aucun abonnement Stripe trouvé. Souscris d'abord à un plan.",
              },
              400,
            );
          }

          const stripe = getStripe();
          const session = await stripe.billingPortal.sessions.create({
            customer: profile.stripe_customer_id,
            return_url: `${origin}/billing`,
          });

          return jsonResponse({ url: session.url }, 200);
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          console.error("[stripe-portal] error:", msg);
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
