// Helpers serveur pour vérifier le plan et le quota CRÉDITS d'un utilisateur.
// Utilisés par les routes API qui consomment de l'IA (génération, recalcul,
// import Excel, chat) ainsi que /api/me-subscription pour propager au client.
//
// 1 crédit = 1 appel IA. La consommation est calculée en comptant les
// lignes de la table `ai_actions` sur la fenêtre de facturation courante.
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { getPlan, type PlanKey } from "@/lib/plans";

export interface UserSubscriptionInfo {
  planKey: PlanKey;
  planStatus: string;
  /** Crédits consommés sur la période en cours. */
  used: number;
  /** Quota max sur la période (null = illimité). */
  limit: number | null;
  /** Reste à consommer ce mois (null = illimité). */
  remaining: number | null;
  /** Début de la fenêtre de comptage (utile pour debug + UI). */
  periodStart: string;
  /** L'utilisateur peut-il déclencher une action IA (générer, chat, etc.) ? */
  canGenerate: boolean;
  currentPeriodEnd: string | null;
  trialEndsAt: string | null;
  cancelAt: string | null;
}

/**
 * Récupère l'état d'abo + le quota crédits d'un utilisateur. Crée le profil
 * au vol si manquant (filet de sécurité — ne devrait pas arriver grâce au
 * trigger DB on_auth_user_created).
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

  const periodStart = computePeriodStart(
    planKey,
    profile?.current_period_end ?? null,
  );

  // Crédits consommés = SOMME des credits_consumed dans ai_actions
  // sur la fenêtre courante. Si la table n'existe pas encore (migration
  // pas appliquée), on retombe sur 0 — backward compat.
  let used = 0;
  try {
    const { data, error } = await supabaseAdmin
      .from("ai_actions")
      .select("credits_consumed")
      .eq("user_id", userId)
      .gte("created_at", periodStart);
    if (!error && data) {
      used = data.reduce(
        (acc, row) => acc + ((row as any).credits_consumed ?? 1),
        0,
      );
    }
  } catch (e) {
    console.info("[subscription] ai_actions indisponible:", e);
  }

  const limit = plan.monthlyCredits;
  const remaining = limit === null ? null : Math.max(0, limit - used);

  const statusOk =
    planStatus === "active" ||
    planStatus === "trialing" ||
    planStatus === "canceled";
  const canGenerate = statusOk && (limit === null || used < limit);

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
    const end = new Date(currentPeriodEnd);
    const start = new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
    return start.toISOString();
  }
  const now = new Date();
  const start = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0),
  );
  return start.toISOString();
}

/**
 * Helper : insère une ligne dans ai_actions pour facturer un crédit.
 * Tolérant si la table n'existe pas (silently no-op pendant la transition
 * d'une ancienne base sans la migration credits).
 */
export async function logAiAction(
  userId: string,
  actionType: "generate" | "recompute" | "import" | "chat",
  roadbookId: string | null,
  metadata?: Record<string, unknown>,
): Promise<void> {
  try {
    await supabaseAdmin.from("ai_actions").insert({
      user_id: userId,
      action_type: actionType,
      roadbook_id: roadbookId,
      credits_consumed: 1,
      metadata: metadata ?? null,
    } as never);
  } catch (e) {
    console.warn("[logAiAction] failed (table missing?):", e);
  }
}
