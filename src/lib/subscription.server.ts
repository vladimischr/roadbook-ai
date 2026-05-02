// Helpers serveur — vérifient le plan + les DEUX QUOTAS DISTINCTS d'un user :
//
//   1. Roadbook quota   → nombre de nouveaux roadbooks créés (génération
//                          IA, saisie manuelle avec assist IA, import Excel)
//   2. Chat credits     → nombre de modifications IA post-création
//                          (chat IA, recalcul complet)
//
// Les deux sont comptés depuis la table `ai_actions` filtrée par
// `action_type` sur la fenêtre de facturation courante.
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { getPlan, type PlanKey } from "@/lib/plans";

export interface UserSubscriptionInfo {
  planKey: PlanKey;
  planStatus: string;

  /** Roadbooks créés sur la période. */
  roadbooksUsed: number;
  /** Quota max de roadbooks (null = illimité). */
  roadbooksLimit: number | null;
  /** Reste de roadbooks ce mois (null = illimité). */
  roadbooksRemaining: number | null;
  /** Peut créer un nouveau roadbook ? */
  canGenerate: boolean;

  /** Crédits chat IA / recalcul consommés sur la période. */
  chatCreditsUsed: number;
  /** Quota max de chat credits (null = illimité). */
  chatCreditsLimit: number | null;
  /** Reste de chat credits ce mois. */
  chatCreditsRemaining: number | null;
  /** Peut utiliser le chat IA / recalcul ? */
  canChat: boolean;

  /** Backward compat — ancien champ "used" → roadbooks count. */
  used: number;
  /** Backward compat — ancien champ "limit" → roadbooks limit. */
  limit: number | null;
  /** Backward compat — ancien champ "remaining" → roadbooks remaining. */
  remaining: number | null;

  /** Début de la fenêtre de comptage. */
  periodStart: string;
  currentPeriodEnd: string | null;
  trialEndsAt: string | null;
  cancelAt: string | null;
}

export type AiActionType = "generate" | "import" | "recompute" | "chat";

/**
 * Compte les actions d'un user sur la période courante, retourne un objet
 * { generate, import, recompute, chat }. Tolérant si la table n'existe
 * pas (retourne tous les compteurs à 0).
 */
async function countActions(
  userId: string,
  periodStart: string,
): Promise<Record<AiActionType, number>> {
  const counters: Record<AiActionType, number> = {
    generate: 0,
    import: 0,
    recompute: 0,
    chat: 0,
  };
  try {
    const { data, error } = await supabaseAdmin
      .from("ai_actions")
      .select("action_type")
      .eq("user_id", userId)
      .gte("created_at", periodStart);
    if (!error && data) {
      for (const row of data) {
        const type = (row as any).action_type as AiActionType;
        if (type in counters) counters[type] += 1;
      }
    }
  } catch (e) {
    console.info("[subscription] ai_actions indisponible:", e);
  }
  return counters;
}

/**
 * Récupère l'état d'abo + les 2 quotas (roadbooks + chat). Crée le profil
 * au vol si manquant (filet de sécurité).
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

  const counters = await countActions(userId, periodStart);

  // Roadbooks = generate + import (chaque nouveau roadbook créé).
  const roadbooksUsed = counters.generate + counters.import;
  const roadbooksLimit = plan.monthlyRoadbookLimit;
  const roadbooksRemaining =
    roadbooksLimit === null
      ? null
      : Math.max(0, roadbooksLimit - roadbooksUsed);

  // Chat credits = chat + recompute (toutes modifications IA post-création).
  const chatCreditsUsed = counters.chat + counters.recompute;
  const chatCreditsLimit = plan.monthlyChatCredits;
  const chatCreditsRemaining =
    chatCreditsLimit === null
      ? null
      : Math.max(0, chatCreditsLimit - chatCreditsUsed);

  // Status check global (paiement échoué ou abonnement annulé bloque tout).
  // On accepte uniquement "active" et "trialing" comme statuts vivants. Un
  // user passé "canceled" verra son plan_key remis à "free" par le webhook
  // customer.subscription.deleted — il tombera donc naturellement sur les
  // quotas du plan free (toujours canGenerate=true tant que < 2 roadbooks).
  // Pour un user "free" sans abonnement Stripe, planStatus est "active" par
  // défaut (set à la création du profil), donc ça marche aussi.
  const statusOk = planStatus === "active" || planStatus === "trialing";

  const canGenerate =
    statusOk && (roadbooksLimit === null || roadbooksUsed < roadbooksLimit);
  const canChat =
    statusOk &&
    plan.allowsAIChat &&
    (chatCreditsLimit === null || chatCreditsUsed < chatCreditsLimit);

  return {
    planKey,
    planStatus,

    roadbooksUsed,
    roadbooksLimit,
    roadbooksRemaining,
    canGenerate,

    chatCreditsUsed,
    chatCreditsLimit,
    chatCreditsRemaining,
    canChat,

    // Backward compat
    used: roadbooksUsed,
    limit: roadbooksLimit,
    remaining: roadbooksRemaining,

    periodStart,
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
 * Helper : insère une ligne dans ai_actions pour facturer un appel IA.
 * Le quota concerné dépend du type :
 *   - 'generate' / 'import' → quota roadbooks
 *   - 'chat' / 'recompute'  → quota chat credits
 */
export async function logAiAction(
  userId: string,
  actionType: AiActionType,
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
