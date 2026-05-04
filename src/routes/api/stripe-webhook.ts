import { createFileRoute } from "@tanstack/react-router";
import Stripe from "stripe";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { getStripe } from "@/integrations/stripe/client.server";
import { planKeyForStripePrice, type PlanKey } from "@/lib/plans";

// ============================================================================
// Webhook Stripe — source de vérité pour l'état d'abonnement
// ============================================================================
// Stripe pousse ici à chaque changement (souscription créée, paiement réussi,
// annulation, échec de prélèvement). On traduit l'event en mise à jour de la
// table `profiles`.
//
// CRITIQUE : on doit vérifier la signature avec `constructEventAsync` (variante
// asynchrone qui utilise Web Crypto via `createSubtleCryptoProvider`) — la
// version sync ne marche pas sur Cloudflare Workers.
//
// CONFIG STRIPE : dans le dashboard Stripe → Developers → Webhooks, créer
// un endpoint pointant vers https://<ton-domaine>/api/stripe-webhook avec
// les events suivants activés :
//   - checkout.session.completed
//   - customer.subscription.created
//   - customer.subscription.updated
//   - customer.subscription.deleted
//   - invoice.payment_succeeded
//   - invoice.payment_failed
// Puis copier le "Signing secret" dans STRIPE_WEBHOOK_SECRET.

export const Route = createFileRoute("/api/stripe-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
        if (!webhookSecret) {
          console.error("[stripe-webhook] STRIPE_WEBHOOK_SECRET manquant");
          return new Response("server misconfigured", { status: 500 });
        }

        const signature = request.headers.get("stripe-signature");
        if (!signature) {
          return new Response("missing signature", { status: 400 });
        }

        // IMPORTANT : on doit lire le body en RAW (texte) pour que la
        // vérification de signature fonctionne. Pas de .json() ici — Stripe
        // calcule la signature sur la chaîne exacte qu'il a envoyée.
        const rawBody = await request.text();

        const stripe = getStripe();
        let event: Stripe.Event;
        try {
          // constructEventAsync + cryptoProvider = compatible Workers.
          event = await stripe.webhooks.constructEventAsync(
            rawBody,
            signature,
            webhookSecret,
            undefined,
            (Stripe as any).createSubtleCryptoProvider(),
          );
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          console.error("[stripe-webhook] signature invalide:", msg);
          return new Response(`webhook signature invalide: ${msg}`, {
            status: 400,
          });
        }

        try {
          switch (event.type) {
            case "checkout.session.completed": {
              const session = event.data.object as Stripe.Checkout.Session;
              await handleCheckoutCompleted(session);
              break;
            }
            case "customer.subscription.created":
            case "customer.subscription.updated": {
              const sub = event.data.object as Stripe.Subscription;
              await handleSubscriptionUpsert(sub);
              break;
            }
            case "customer.subscription.deleted": {
              const sub = event.data.object as Stripe.Subscription;
              await handleSubscriptionCanceled(sub);
              break;
            }
            case "invoice.payment_failed": {
              const invoice = event.data.object as Stripe.Invoice;
              await handlePaymentFailed(invoice);
              break;
            }
            default:
              // On ignore les events qu'on n'écoute pas — pas d'erreur.
              break;
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          console.error(
            `[stripe-webhook] handler error for ${event.type}:`,
            msg,
          );
          // On répond 500 → Stripe va retenter automatiquement (jusqu'à 3
          // jours). Important pour ne pas perdre un upgrade par erreur
          // transient en DB.
          return new Response("handler failed", { status: 500 });
        }

        return new Response(JSON.stringify({ received: true }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      },
    },
  },
});

/* ========================================================================
 * Handlers spécifiques par type d'event
 * ====================================================================== */

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  // Le checkout vient de réussir. Si une subscription a été créée, on la
  // récupère pour avoir les infos complètes (la session.subscription est
  // juste l'id ici).
  const subId =
    typeof session.subscription === "string"
      ? session.subscription
      : session.subscription?.id;
  if (!subId) {
    console.warn("[stripe-webhook] checkout.completed sans subscription id");
    return;
  }
  const stripe = getStripe();
  const sub = await stripe.subscriptions.retrieve(subId);
  await handleSubscriptionUpsert(sub);
}

async function handleSubscriptionUpsert(sub: Stripe.Subscription) {
  const customerId =
    typeof sub.customer === "string" ? sub.customer : sub.customer.id;

  // Stripe peut envoyer plusieurs items pour une seule sub (rare, mais
  // possible si on ajoute des add-ons plus tard). On prend le premier.
  const priceId = sub.items.data[0]?.price?.id;
  const planKey: PlanKey | null = priceId
    ? planKeyForStripePrice(priceId)
    : null;

  if (!planKey) {
    console.warn(
      `[stripe-webhook] price_id ${priceId} non mappé à un plan_key — ignoré`,
    );
    return;
  }

  // Stripe nous donne current_period_end en secondes Unix. On convertit en
  // ISO pour timestamptz.
  const periodEnd = sub.current_period_end
    ? new Date(sub.current_period_end * 1000).toISOString()
    : null;
  const trialEnd = sub.trial_end
    ? new Date(sub.trial_end * 1000).toISOString()
    : null;
  const cancelAt = sub.cancel_at
    ? new Date(sub.cancel_at * 1000).toISOString()
    : null;

  // Status normalisé. Si l'abo est en past_due / incomplete / unpaid, on
  // GARDE le plan_key (pour que le compte ait toujours accès) mais on note
  // le plan_status — l'UI affichera un bandeau "mettre à jour ta CB".
  const status = sub.status;

  // Lookup du profil par stripe_customer_id (set lors du checkout).
  const { data: profile, error: lookupErr } = await supabaseAdmin
    .from("profiles")
    .select("id")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();

  if (lookupErr || !profile) {
    // Fallback : si le profil n'a pas le customer_id (ex: sub créée hors
    // checkout via dashboard Stripe), on tente de retrouver via les
    // metadata.
    const metadataUserId = sub.metadata?.supabase_user_id;
    if (!metadataUserId) {
      console.error(
        `[stripe-webhook] customer ${customerId} introuvable et pas de metadata user_id`,
      );
      return;
    }
    await supabaseAdmin
      .from("profiles")
      .update({
        stripe_customer_id: customerId,
        stripe_subscription_id: sub.id,
        plan_key: planKey,
        plan_status: status,
        current_period_end: periodEnd,
        trial_ends_at: trialEnd,
        cancel_at: cancelAt,
      })
      .eq("id", metadataUserId);
    return;
  }

  await supabaseAdmin
    .from("profiles")
    .update({
      stripe_subscription_id: sub.id,
      plan_key: planKey,
      plan_status: status,
      current_period_end: periodEnd,
      trial_ends_at: trialEnd,
      cancel_at: cancelAt,
    })
    .eq("id", profile.id);
}

async function handleSubscriptionCanceled(sub: Stripe.Subscription) {
  const customerId =
    typeof sub.customer === "string" ? sub.customer : sub.customer.id;
  // L'abonnement est définitivement terminé (soit l'utilisateur a annulé et
  // la période s'est écoulée, soit Stripe a tué la sub). On retombe sur
  // le free tier.
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
    .eq("stripe_customer_id", customerId);
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  // Si le paiement d'une facture (renouvellement mensuel typiquement)
  // échoue, on marque le profil past_due. L'UI affichera un bandeau "ta CB
  // a été refusée, mets-la à jour dans le portail".
  const customerId =
    typeof invoice.customer === "string"
      ? invoice.customer
      : invoice.customer?.id;
  if (!customerId) return;
  await supabaseAdmin
    .from("profiles")
    .update({ plan_status: "past_due" })
    .eq("stripe_customer_id", customerId);
}
