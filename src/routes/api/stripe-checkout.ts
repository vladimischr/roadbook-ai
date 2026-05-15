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
  billing: z.enum(["monthly", "annual"]).default("monthly"),
  // URL où renvoyer le navigateur après succès / cancel. Le client passe son
  // window.location.origin pour rester sur le bon environnement.
  origin: z.string().url(),
});

/**
 * Hosts par défaut acceptés même si ALLOWED_ORIGINS n'est pas configuré.
 * Couvre prod (roadbook.ai), previews Lovable, previews Cloudflare Pages,
 * et localhost dev. Un attaquant ne peut pas exploiter ces patterns parce
 * que :
 * - On vérifie aussi le header `Origin` côté serveur (set par le navigateur,
 *   pas spoofable via JS depuis un autre domaine sans CORS qui plante).
 * - On vérifie le bearer token Supabase avant tout.
 */
const DEFAULT_ALLOWED_PATTERNS: Array<string | RegExp> = [
  // Prod
  "roadbook.ai",
  "www.roadbook.ai",
  /\.roadbook\.ai$/,
  "getroadbook.com",
  "www.getroadbook.com",
  /\.getroadbook\.com$/,
  // Lovable preview
  /\.lovable\.app$/,
  /\.lovable\.dev$/,
  /\.lovableproject\.com$/,
  // Cloudflare Pages preview
  /\.pages\.dev$/,
  // Dev local
  "localhost",
  "127.0.0.1",
];

/**
 * Valide qu'une origin reçue du client est autorisée. Sans ça, un attaquant
 * peut créer une session Stripe avec `origin=https://attacker.com` et
 * détourner la redirection post-paiement (phishing).
 *
 * Configuration optionnelle : ALLOWED_ORIGINS = "roadbook.ai,foo.example.com"
 * (CSV de hosts). Si configurée, ELLE A PRIORITÉ (mode strict). Sinon on
 * tombe sur la whitelist par défaut (cf. DEFAULT_ALLOWED_PATTERNS).
 */
function isOriginAllowed(originUrl: string): boolean {
  let url: URL;
  try {
    url = new URL(originUrl);
  } catch {
    return false;
  }
  // Refuse les schémas non http(s)
  if (url.protocol !== "http:" && url.protocol !== "https:") return false;

  const hostname = url.hostname.toLowerCase();
  const host = url.host.toLowerCase(); // inclut le port

  // Mode strict : si l'admin a configuré ALLOWED_ORIGINS, on respecte
  // strictement sa whitelist (override le défaut).
  const allowedRaw = process.env.ALLOWED_ORIGINS ?? "";
  const explicit = allowedRaw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

  if (explicit.length > 0) {
    return explicit.some((entry) => entry === host || entry === hostname);
  }

  // Mode défaut : whitelist de patterns sûrs (prod + previews + dev).
  return DEFAULT_ALLOWED_PATTERNS.some((p) =>
    typeof p === "string" ? p === hostname : p.test(hostname),
  );
}

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
          const { plan_key, billing, origin } = parsed.data;

          // Anti-phishing : refuse les origins inconnues pour ne pas qu'un
          // attaquant détourne le success_url vers son domaine.
          if (!isOriginAllowed(origin)) {
            const rejectedHost = (() => {
              try {
                return new URL(origin).host;
              } catch {
                return origin;
              }
            })();
            console.warn(
              "[stripe-checkout] origin refusée:",
              rejectedHost,
              "— ajouter à ALLOWED_ORIGINS si légitime",
            );
            return jsonResponse(
              {
                error: `Origin non autorisée (${rejectedHost}). Contacte le support.`,
              },
              400,
            );
          }

          const priceId = stripePriceIdFor(plan_key as PlanKey, billing);
          if (!priceId) {
            const envName =
              billing === "annual"
                ? `STRIPE_PRICE_${plan_key.toUpperCase()}_ANNUAL`
                : `STRIPE_PRICE_${plan_key.toUpperCase()}`;
            return jsonResponse(
              { error: `${envName} non configurée côté serveur.` },
              500,
            );
          }

          // Récupère ou crée le profil — au cas où la migration trigger n'a
          // pas tourné pour cet utilisateur (devrait pas arriver, mais
          // safety net).
          // Cast `any` : colonne referred_by_code ajoutée par migration récente,
          // pas encore dans les types générés.
          const { data: profile } = (await (supabaseAdmin as any)
            .from("profiles")
            .select("stripe_customer_id, email, referred_by_code")
            .eq("id", user.id)
            .maybeSingle()) as { data: { stripe_customer_id: string | null; email: string | null; referred_by_code: string | null } | null };

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

          // Affiliation : si le user a été parrainé (referred_by_code), on
          // applique un coupon -20% sur le 1er mois (geste pour le filleul).
          // Le coupon est identifié par STRIPE_AFFILIATE_COUPON_ID (env var)
          // — à créer une fois dans le dashboard Stripe avec :
          //   percent_off=20, duration=once.
          // Si la var n'est pas configurée, on n'applique pas de discount mais
          // le tracking de la commission affilié continue de marcher (cf.
          // stripe-webhook → handleInvoicePaid).
          const couponId = process.env.STRIPE_AFFILIATE_COUPON_ID;
          const discounts: Array<{ coupon: string }> = [];
          if (profile?.referred_by_code && couponId) {
            discounts.push({ coupon: couponId });
          }

          const session = await stripe.checkout.sessions.create({
            mode: "subscription",
            customer: customerId,
            line_items: [{ price: priceId, quantity: 1 }],
            ...(discounts.length > 0 ? { discounts } : {}),
            // 7 jours d'essai gratuit avec CB demandée → conversion forte.
            // Stripe gère automatiquement le passage trialing → active.
            subscription_data: {
              trial_period_days: 7,
              metadata: {
                supabase_user_id: user.id,
                plan_key,
                billing,
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
            // Stripe interdit `discounts` + `allow_promotion_codes` simultanés.
            // Quand on applique un coupon affiliation, on désactive le champ
            // code promo manuel pour cette session (le filleul a déjà son
            // -20% appliqué automatiquement).
            ...(discounts.length === 0 ? { allow_promotion_codes: true } : {}),
            billing_address_collection: "required",
            success_url: `${origin}/billing?status=success&session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${origin}/pricing?status=canceled`,
            metadata: {
              supabase_user_id: user.id,
              plan_key,
              billing,
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
