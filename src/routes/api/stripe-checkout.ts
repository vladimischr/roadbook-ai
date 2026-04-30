import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { getStripe } from "@/integrations/stripe/client.server";
import { stripePriceIdFor, type PlanKey } from "@/lib/plans";

// ============================================================================
// Crée une session Stripe Checkout pour souscrire (ou changer de plan)
// ============================================================================
// Le client appelle POST /api/stripe-checkout { plan_key: "solo" }
// On retourne l'URL hébergée par Stripe — le navigateur fait window.location =
// data.url pour rediriger vers la page de paiement.
//
// Sécurité : on récupère le user via le bearer token Supabase. Sans ça,
// n'importe qui pourrait créer une session avec n'importe quel customer_id.

const inputSchema = z.object({
  plan_key: z.enum(["solo", "studio", "atelier"]),
  // URL où renvoyer le navigateur après succès / cancel. Le client passe son
  // window.location.origin pour rester sur le bon environnement.
  origin: z.string().url(),
});

export const Route = createFileRoute("/api/stripe-checkout")({
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
            return jsonResponse(
              { error: "Payload invalide", issues: parsed.error.issues },
              400,
            );
          }
          const { plan_key, origin } = parsed.data;

          const priceId = stripePriceIdFor(plan_key as PlanKey);
          if (!priceId) {
            return jsonResponse(
              {
                error: `STRIPE_PRICE_${plan_key.toUpperCase()} non configurée côté serveur.`,
              },
              500,
            );
          }

          // Récupère ou crée le profil — au cas où la migration trigger n'a
          // pas tourné pour cet utilisateur (devrait pas arriver, mais
          // safety net).
          const { data: profile } = await supabaseAdmin
            .from("profiles")
            .select("stripe_customer_id, email")
            .eq("id", user.id)
            .maybeSingle();

          const stripe = getStripe();

          // Crée le customer Stripe à la première souscription, puis le
          // réutilise pour les changements de plan ulterieurs (sinon Stripe
          // considère chaque souscription comme un nouveau client).
          let customerId = profile?.stripe_customer_id ?? null;
          if (!customerId) {
            const customer = await stripe.customers.create({
              email: user.email ?? profile?.email ?? undefined,
              metadata: { supabase_user_id: user.id },
            });
            customerId = customer.id;
            await supabaseAdmin
              .from("profiles")
              .update({ stripe_customer_id: customerId })
              .eq("id", user.id);
          }

          const session = await stripe.checkout.sessions.create({
            mode: "subscription",
            customer: customerId,
            line_items: [{ price: priceId, quantity: 1 }],
            // 14 jours d'essai gratuit avec CB demandée → conversion forte.
            // Stripe gère automatiquement le passage trialing → active.
            subscription_data: {
              trial_period_days: 14,
              metadata: {
                supabase_user_id: user.id,
                plan_key,
              },
            },
            // Permet à Stripe de gérer la TVA EU automatiquement (si Stripe
            // Tax est activé dans le dashboard). Sinon ignoré.
            automatic_tax: { enabled: true },
            // Indispensable avec automatic_tax + customer existant : sans ça
            // Stripe refuse parce que le customer n'a pas encore d'adresse,
            // et il ne sait pas où récupérer l'adresse facturation entrée
            // dans Checkout. "auto" = utilise l'adresse saisie dans Checkout
            // pour mettre à jour le customer.
            customer_update: {
              address: "auto",
              name: "auto",
            },
            allow_promotion_codes: true,
            billing_address_collection: "required",
            success_url: `${origin}/billing?status=success&session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${origin}/pricing?status=canceled`,
            metadata: {
              supabase_user_id: user.id,
              plan_key,
            },
          });

          return jsonResponse({ url: session.url, id: session.id }, 200);
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          console.error("[stripe-checkout] error:", msg);
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
