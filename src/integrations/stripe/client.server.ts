// Client Stripe configuré pour s'exécuter sur Cloudflare Workers.
// Le SDK Node-natif de Stripe n'est pas compatible Workers (il dépend de
// http/https Node) — il faut explicitement injecter le httpClient fetch et
// le crypto provider Web Crypto, sinon `stripe.checkout.sessions.create`
// throw "Cannot read properties of undefined (reading 'request')".
import Stripe from "stripe";

let _stripe: Stripe | undefined;

export function getStripe(): Stripe {
  if (_stripe) return _stripe;
  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) {
    throw new Error(
      "STRIPE_SECRET_KEY non configurée — ajoute la dans les env vars du Worker.",
    );
  }
  _stripe = new Stripe(secret, {
    apiVersion: "2025-02-24.acacia",
    httpClient: Stripe.createFetchHttpClient(),
  });
  return _stripe;
}
