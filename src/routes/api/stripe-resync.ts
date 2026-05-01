import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { getStripe } from "@/integrations/stripe/client.server";
import { planKeyForStripePrice } from "@/lib/plans";

// ============================================================================
// /api/stripe-resync — synchronise immédiatement le profil avec Stripe
// ============================================================================
// Appelé par le client au retour de Checkout (?status=success). Le webhook
// reste la source de vérité long-terme, mais ce endpoint comble la latence
// (ou un webhook qui n'arrive pas) en interrogeant directement l'API Stripe.
//
// L'utilisateur clique → on identifie sa subscription via stripe_customer_id
// (déjà set au moment du checkout) ou via la session_id passée en query →
// on lit l'état réel dans Stripe → on écrit dans profiles. Idempotent.

export const Route = createFileRoute("/api/stripe-resync")({
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
        const userId = userData.user.id;

        let body: { session_id?: string } = {};
        try {
          body = await request.json();
        } catch {
          // session_id optionnel
        }

        const stripe = getStripe();

        // 1. Trouve le customer_id (depuis profile, ou depuis la session passée)
        const { data: profile } = await supabaseAdmin
          .from("profiles")
          .select("stripe_customer_id")
          .eq("id", userId)
          .maybeSingle();

        let customerId = (profile as any)?.stripe_customer_id as
          | string
          | null;

        if (!customerId && body.session_id) {
          try {
            const session = await stripe.checkout.sessions.retrieve(
              body.session_id,
            );
            customerId =
              typeof session.customer === "string"
                ? session.customer
                : session.customer?.id || null;
            if (customerId) {
              await supabaseAdmin
                .from("profiles")
                .update({ stripe_customer_id: customerId })
                .eq("id", userId);
            }
          } catch (e) {
            console.warn("[stripe-resync] session retrieve failed:", e);
          }
        }

        if (!customerId) {
          return jsonResponse(
            { error: "Aucun customer Stripe associé à ce compte." },
            404,
          );
        }

        // 2. Liste les abonnements actifs/trialing/past_due pour ce customer
        const subs = await stripe.subscriptions.list({
          customer: customerId,
          status: "all",
          limit: 5,
        });

        // Priorité aux statuts vivants
        const liveStatuses = new Set([
          "active",
          "trialing",
          "past_due",
          "unpaid",
          "incomplete",
        ]);
        const sub =
          subs.data.find((s) => liveStatuses.has(s.status)) ?? subs.data[0];

        if (!sub) {
          // Pas d'abonnement → repasse free (cas du customer créé sans
          // subscription, peu probable mais propre).
          await supabaseAdmin
            .from("profiles")
            .update({
              plan_key: "free",
              plan_status: "canceled",
              stripe_subscription_id: null,
              current_period_end: null,
              trial_ends_at: null,
              cancel_at: null,
            })
            .eq("id", userId);
          return jsonResponse({ plan_key: "free", status: "canceled" }, 200);
        }

        const priceId = sub.items.data[0]?.price?.id;
        const planKey = priceId ? planKeyForStripePrice(priceId) : null;
        if (!planKey) {
          return jsonResponse(
            { error: `price_id ${priceId} non mappé à un plan_key` },
            500,
          );
        }

        const periodEnd = sub.current_period_end
          ? new Date(sub.current_period_end * 1000).toISOString()
          : null;
        const trialEnd = sub.trial_end
          ? new Date(sub.trial_end * 1000).toISOString()
          : null;
        const cancelAt = sub.cancel_at
          ? new Date(sub.cancel_at * 1000).toISOString()
          : null;

        await supabaseAdmin
          .from("profiles")
          .update({
            stripe_customer_id: customerId,
            stripe_subscription_id: sub.id,
            plan_key: planKey,
            plan_status: sub.status,
            current_period_end: periodEnd,
            trial_ends_at: trialEnd,
            cancel_at: cancelAt,
          })
          .eq("id", userId);

        return jsonResponse(
          {
            plan_key: planKey,
            status: sub.status,
            trial_ends_at: trialEnd,
          },
          200,
        );
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
