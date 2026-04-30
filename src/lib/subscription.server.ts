// Helpers serveur pour vérifier le plan et le quota mensuel d'un utilisateur.
// Utilisés par /api/generate-roadbook, /api/recompute-roadbook, et
// /api/me-subscription pour propager l'info au client.
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { getPlan, type PlanKey } from "@/lib/plans";

export interface UserSubscriptionInfo {
  planKey: PlanKey;
  planStatus: string;
  /** Nombre de roadbooks générés sur la période en cours. */
  used: number;
  /** Quota max sur la période (null = illimité). */
  limit: number | null;
  /** Reste à consommer ce mois (null = illimité). */
  remaining: number | null;
  /** Début de la fenêtre de comptage (utile pour debug + UI). */
  periodStart: string;
  /** L'utilisateur peut-il générer un nouveau roadbook ? */
  canGenerate: boolean;
  currentPeriodEnd: string | null;
  trialEndsAt: string | null;
  cancelAt: string | null;
}

/**
 * Récupère l'état d'abo + le quota d'un utilisateur. Crée le profil au
 * vol si manquant (filet de sécurité — devrait pas arriver grâce au
 * trigger DB).
 */
export async function getUserSubscriptionInfo(
  userId: string,
): Promise<UserSubscriptionInfo> {
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select(
      "plan_key, plan_status, current_period_end, trial_ends_at, cancel_at",
    )
    .eq("id", userId)
    .maybeSingle();

  // Fallback : crée un profil free s'il manque (uniquement si on a un user
  // valide — ne jamais créer de profil orphelin).
  if (!profile) {
    await supabaseAdmin
      .from("profiles")
      .insert({ id: userId, plan_key: "free", plan_status: "active" })
      .select()
      .single();
  }

  const planKey = (profile?.plan_key as PlanKey) ?? "free";
  const planStatus = profile?.plan_status ?? "active";
  const plan = getPlan(planKey);

  // Période de référence pour le comptage :
  // - Plan payant : on compte depuis (current_period_end - 30j) → aligné
  //   sur le cycle de facturation Stripe.
  // - Plan free : on compte depuis le 1er du mois calendaire.
  const periodStart = computePeriodStart(
    planKey,
    profile?.current_period_end ?? null,
  );

  const { count } = await supabaseAdmin
    .from("roadbooks")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", periodStart);

  const used = count ?? 0;
  const limit = plan.monthlyRoadbookLimit;
  const remaining = limit === null ? null : Math.max(0, limit - used);

  // canGenerate : plan illimité OU il reste du quota. Un statut past_due /
  // unpaid bloque aussi la génération (CB à mettre à jour).
  const statusOk =
    planStatus === "active" ||
    planStatus === "trialing" ||
    planStatus === "canceled"; // canceled = encore valide jusqu'à period_end
  const canGenerate =
    statusOk && (limit === null || used < limit);

  return {
    planKey,
    planStatus,
    used,
    limit,
    remaining,
    periodStart,
    canGenerate,
    currentPeriodEnd: profile?.current_period_end ?? null,
    trialEndsAt: profile?.trial_ends_at ?? null,
    cancelAt: profile?.cancel_at ?? null,
  };
}

function computePeriodStart(
  planKey: PlanKey,
  currentPeriodEnd: string | null,
): string {
  if (planKey !== "free" && currentPeriodEnd) {
    // 30 jours avant la prochaine fin de cycle. Pour les sub Stripe en
    // cycle mensuel ça matche pile le début du cycle courant.
    const end = new Date(currentPeriodEnd);
    const start = new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
    return start.toISOString();
  }
  // Free tier (ou plan sans periode connue) : 1er du mois calendaire UTC.
  const now = new Date();
  const start = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0),
  );
  return start.toISOString();
}
