// ============================================================================
// Catalogue de plans — source de vérité unique
// ============================================================================
// Ce fichier est partagé client + serveur. Il définit les 4 tiers, leur prix
// affichable, leur quota, et leur référence Stripe (price_id) injectée via
// env. Si tu changes les Stripe prices dans le dashboard, mets à jour les
// env vars STRIPE_PRICE_* — ne touche pas aux plan_key, ils sont écrits
// dans les profils en base.

export type PlanKey = "free" | "solo" | "studio" | "atelier";
export type Billing = "monthly" | "annual";

export interface Plan {
  /** Clef stockée en DB. NE JAMAIS RENOMMER après mise en prod. */
  key: PlanKey;
  /** Nom affiché à l'utilisateur. */
  name: string;
  /** Tagline éditoriale courte. */
  tagline: string;
  /** Prix mensuel en centimes EUR (0 pour free). */
  priceMonthly: number;
  /** Prix annuel en centimes EUR (avec remise -20% par rapport au mensuel × 12). */
  priceAnnual: number;
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
    priceAnnual: 0,
    monthlyRoadbookLimit: 2,
    allowsPdfExport: true,
    allowsRecompute: false,
    features: [
      "2 roadbooks composés par mois",
      "IA, saisie manuelle ou import Excel",
      "Carte interactive Google Maps",
      "Export PDF avec mention « via Roadbook.ai »",
    ],
  },
  solo: {
    key: "solo",
    name: "Solo",
    tagline: "Travel designer indépendant",
    priceMonthly: 2900,
    priceAnnual: 27900,
    monthlyRoadbookLimit: 15,
    allowsPdfExport: true,
    allowsRecompute: true,
    features: [
      "15 roadbooks composés par mois",
      "IA, saisie manuelle ou import Excel",
      "Recalcul IA illimité",
      "Export PDF éditorial",
      "Support email",
    ],
    highlighted: true,
  },
  studio: {
    key: "studio",
    name: "Studio",
    tagline: "Petite agence 1-3 personnes",
    priceMonthly: 7900,
    priceAnnual: 75900,
    monthlyRoadbookLimit: 50,
    allowsPdfExport: true,
    allowsRecompute: true,
    features: [
      "50 roadbooks composés par mois",
      "IA, saisie manuelle ou import Excel",
      "Recalcul IA illimité",
      "Export PDF haute qualité",
      "Support prioritaire",
    ],
  },
  atelier: {
    key: "atelier",
    name: "Atelier",
    tagline: "Agence établie",
    priceMonthly: 19900,
    priceAnnual: 190900,
    monthlyRoadbookLimit: null,
    allowsPdfExport: true,
    allowsRecompute: true,
    features: [
      "Roadbooks illimités",
      "IA, saisie manuelle ou import Excel",
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

/** Free tier exporte un PDF avec watermark "via Roadbook.ai" — viral loop. */
export function isPdfWatermarked(key: string | null | undefined): boolean {
  return key === "free" || !key;
}

/**
 * Mappe une plan_key + billing → STRIPE_PRICE_ID. Côté serveur uniquement.
 * Lit les env vars correspondantes. Retourne undefined pour "free".
 */
export function stripePriceIdFor(
  key: PlanKey,
  billing: Billing = "monthly",
): string | undefined {
  if (billing === "annual") {
    switch (key) {
      case "solo":
        return process.env.STRIPE_PRICE_SOLO_ANNUAL;
      case "studio":
        return process.env.STRIPE_PRICE_STUDIO_ANNUAL;
      case "atelier":
        return process.env.STRIPE_PRICE_ATELIER_ANNUAL;
      default:
        return undefined;
    }
  }
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
 * Mappe inverse : STRIPE_PRICE_ID → plan_key. Utilisé par le webhook.
 * Reconnait à la fois les prix mensuels et annuels.
 */
export function planKeyForStripePrice(priceId: string): PlanKey | null {
  if (
    priceId === process.env.STRIPE_PRICE_SOLO ||
    priceId === process.env.STRIPE_PRICE_SOLO_ANNUAL
  )
    return "solo";
  if (
    priceId === process.env.STRIPE_PRICE_STUDIO ||
    priceId === process.env.STRIPE_PRICE_STUDIO_ANNUAL
  )
    return "studio";
  if (
    priceId === process.env.STRIPE_PRICE_ATELIER ||
    priceId === process.env.STRIPE_PRICE_ATELIER_ANNUAL
  )
    return "atelier";
  return null;
}

/** Format du prix pour l'UI : "29 €" ou "Gratuit". */
export function formatPlanPrice(priceCents: number): string {
  if (priceCents === 0) return "Gratuit";
  return `${Math.round(priceCents / 100)} €`;
}

/** Prix d'un plan affiché par mois selon le billing choisi. */
export function getDisplayedMonthlyPrice(plan: Plan, billing: Billing): number {
  if (billing === "annual" && plan.priceAnnual > 0) {
    // Affiche le prix annuel divisé par 12, arrondi à l'euro inférieur.
    return Math.floor(plan.priceAnnual / 12 / 100) * 100;
  }
  return plan.priceMonthly;
}

/** Économie réalisée en passant à l'annuel (en centimes EUR). */
export function getAnnualSavings(plan: Plan): number {
  return Math.max(0, plan.priceMonthly * 12 - plan.priceAnnual);
}
