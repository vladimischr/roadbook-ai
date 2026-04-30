// ============================================================================
// Catalogue de plans — source de vérité unique
// ============================================================================
// Ce fichier est partagé client + serveur. Il définit les 4 tiers, leur prix
// affichable, leur quota, et leur référence Stripe (price_id) injectée via
// env. Si tu changes les Stripe prices dans le dashboard, mets à jour les
// env vars STRIPE_PRICE_* — ne touche pas aux plan_key, ils sont écrits
// dans les profils en base.

export type PlanKey = "free" | "solo" | "studio" | "atelier";

export interface Plan {
  /** Clef stockée en DB. NE JAMAIS RENOMMER après mise en prod. */
  key: PlanKey;
  /** Nom affiché à l'utilisateur. */
  name: string;
  /** Tagline éditoriale courte. */
  tagline: string;
  /** Prix mensuel en centimes EUR (0 pour free). */
  priceMonthly: number;
  /** Quota mensuel de roadbooks générés (null = illimité). */
  monthlyRoadbookLimit: number | null;
  /** PDF haute qualité accessible ? Le free n'y a pas droit. */
  allowsPdfExport: boolean;
  /** L'utilisateur peut-il déclencher un recalcul IA ? */
  allowsRecompute: boolean;
  /** Liste de bénéfices à afficher sur la page Pricing. */
  features: string[];
  /** Mis en avant comme « le plus populaire » sur la page de prix. */
  highlighted?: boolean;
}

export const PLANS: Record<PlanKey, Plan> = {
  free: {
    key: "free",
    name: "Découverte",
    tagline: "Pour goûter à l'outil",
    priceMonthly: 0,
    monthlyRoadbookLimit: 2,
    allowsPdfExport: false,
    allowsRecompute: false,
    features: [
      "2 roadbooks générés par mois",
      "Édition manuelle illimitée",
      "Carte interactive",
      "Aperçu en ligne uniquement",
    ],
  },
  solo: {
    key: "solo",
    name: "Solo",
    tagline: "Travel designer indépendant",
    priceMonthly: 2900,
    monthlyRoadbookLimit: 15,
    allowsPdfExport: true,
    allowsRecompute: true,
    features: [
      "15 roadbooks générés par mois",
      "Recalcul IA illimité",
      "Export PDF éditorial",
      "Couvertures Pexels",
      "Support email",
    ],
    highlighted: true,
  },
  studio: {
    key: "studio",
    name: "Studio",
    tagline: "Petite agence 1-3 personnes",
    priceMonthly: 7900,
    monthlyRoadbookLimit: 50,
    allowsPdfExport: true,
    allowsRecompute: true,
    features: [
      "50 roadbooks générés par mois",
      "Recalcul IA illimité",
      "Export PDF haute qualité",
      "Import Excel des programmes",
      "Support prioritaire",
    ],
  },
  atelier: {
    key: "atelier",
    name: "Atelier",
    tagline: "Agence établie",
    priceMonthly: 19900,
    monthlyRoadbookLimit: null,
    allowsPdfExport: true,
    allowsRecompute: true,
    features: [
      "Génération illimitée",
      "Recalcul IA illimité",
      "Export PDF marque blanche",
      "Multi-utilisateurs (à venir)",
      "Support dédié",
    ],
  },
};

export const PAID_PLAN_ORDER: PlanKey[] = ["solo", "studio", "atelier"];
export const ALL_PLAN_ORDER: PlanKey[] = ["free", "solo", "studio", "atelier"];

export function getPlan(key: string | null | undefined): Plan {
  const k = (key as PlanKey) ?? "free";
  return PLANS[k] ?? PLANS.free;
}

export function isPaidPlan(key: string | null | undefined): boolean {
  return key === "solo" || key === "studio" || key === "atelier";
}

/**
 * Mappe une plan_key → STRIPE_PRICE_ID. Côté serveur uniquement. Lit les
 * env vars (STRIPE_PRICE_SOLO, STRIPE_PRICE_STUDIO, STRIPE_PRICE_ATELIER).
 * Retourne undefined pour "free" — le free tier n'a pas de price Stripe.
 */
export function stripePriceIdFor(key: PlanKey): string | undefined {
  switch (key) {
    case "solo":
      return process.env.STRIPE_PRICE_SOLO;
    case "studio":
      return process.env.STRIPE_PRICE_STUDIO;
    case "atelier":
      return process.env.STRIPE_PRICE_ATELIER;
    default:
      return undefined;
  }
}

/**
 * Mappe inverse : STRIPE_PRICE_ID → plan_key. Utilisé par le webhook pour
 * savoir à quel plan associer une subscription quand Stripe envoie un event.
 */
export function planKeyForStripePrice(priceId: string): PlanKey | null {
  if (priceId === process.env.STRIPE_PRICE_SOLO) return "solo";
  if (priceId === process.env.STRIPE_PRICE_STUDIO) return "studio";
  if (priceId === process.env.STRIPE_PRICE_ATELIER) return "atelier";
  return null;
}

/** Format du prix pour l'UI : "29 €" ou "Gratuit". */
export function formatPlanPrice(priceCents: number): string {
  if (priceCents === 0) return "Gratuit";
  return `${Math.round(priceCents / 100)} €`;
}
