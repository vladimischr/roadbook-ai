-- ============================================================================
-- Enforcement DB des quotas IA — trigger BEFORE INSERT sur ai_actions
-- ============================================================================
-- Aujourd'hui les quotas sont vérifiés API-side via getUserSubscriptionInfo().
-- Un user qui contournerait l'API (Supabase JS direct avec son JWT) pourrait
-- théoriquement insérer dans ai_actions et créer des roadbooks sans limite,
-- même si actuellement la policy d'INSERT n'autorise pas authenticated.
--
-- Pour un défense en profondeur, on ajoute un trigger BEFORE INSERT qui :
--   1. Récupère le plan_key du user
--   2. Compte ses actions de la période courante
--   3. Refuse si la limite est atteinte
--
-- Note : ai_actions n'a actuellement PAS de policy INSERT pour authenticated
-- (cf. migration 20260504000000), donc seul le service_role peut insérer.
-- Mais le trigger s'applique aussi au service_role (sauf SECURITY DEFINER
-- avec auth.uid() IS NULL check) — on doit donc bypass quand auth.uid() est
-- null (= service_role webhook).

CREATE OR REPLACE FUNCTION public.enforce_ai_action_quota()
RETURNS TRIGGER AS $$
DECLARE
  v_plan_key TEXT;
  v_plan_status TEXT;
  v_period_start TIMESTAMPTZ;
  v_count INTEGER;
  v_roadbook_limit INTEGER;
  v_chat_limit INTEGER;
  v_current_period_end TIMESTAMPTZ;
BEGIN
  -- Le service_role bypasse RLS et auth.uid() est null → pas de check.
  -- Cela inclut les inserts depuis l'API serveur (logAiAction) qui ont
  -- déjà fait leurs propres vérifications.
  --
  -- Si on voulait verrouiller à 100% on pourrait checker même en service
  -- role, mais cela créerait des race conditions difficiles à débugger
  -- avec les retries. On se contente de bloquer les abus user-side.
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  -- Lit le plan et la fin de période du user
  SELECT plan_key, plan_status, current_period_end
    INTO v_plan_key, v_plan_status, v_current_period_end
  FROM public.profiles
  WHERE id = NEW.user_id;

  IF v_plan_key IS NULL THEN
    v_plan_key := 'free';
    v_plan_status := 'active';
  END IF;

  -- Statut paiement bloquant
  IF v_plan_status NOT IN ('active', 'trialing') THEN
    RAISE EXCEPTION 'subscription_inactive: plan_status = %', v_plan_status
      USING ERRCODE = 'check_violation';
  END IF;

  -- Calcule le début de période (1er du mois pour free, current_period_end - 30j pour payant)
  IF v_plan_key <> 'free' AND v_current_period_end IS NOT NULL THEN
    v_period_start := v_current_period_end - INTERVAL '30 days';
  ELSE
    v_period_start := date_trunc('month', now() AT TIME ZONE 'UTC');
  END IF;

  -- Quotas par plan (source de vérité miroirée depuis /src/lib/plans.ts)
  IF v_plan_key = 'free' THEN
    v_roadbook_limit := 5;
    v_chat_limit := 25;
  ELSIF v_plan_key = 'solo' THEN
    v_roadbook_limit := 15;
    v_chat_limit := 50;
  ELSIF v_plan_key = 'studio' THEN
    v_roadbook_limit := 50;
    v_chat_limit := 200;
  ELSIF v_plan_key = 'atelier' THEN
    v_roadbook_limit := NULL; -- illimité
    v_chat_limit := NULL;
  ELSE
    v_roadbook_limit := 5;
    v_chat_limit := 25;
  END IF;

  -- Roadbooks = generate + import
  IF NEW.action_type IN ('generate', 'import') AND v_roadbook_limit IS NOT NULL THEN
    SELECT count(*) INTO v_count
    FROM public.ai_actions
    WHERE user_id = NEW.user_id
      AND action_type IN ('generate', 'import')
      AND created_at >= v_period_start;
    IF v_count >= v_roadbook_limit THEN
      RAISE EXCEPTION 'roadbook_quota_exceeded: % / % on plan %', v_count, v_roadbook_limit, v_plan_key
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  -- Chat credits = chat + recompute
  IF NEW.action_type IN ('chat', 'recompute') AND v_chat_limit IS NOT NULL THEN
    SELECT count(*) INTO v_count
    FROM public.ai_actions
    WHERE user_id = NEW.user_id
      AND action_type IN ('chat', 'recompute')
      AND created_at >= v_period_start;
    IF v_count >= v_chat_limit THEN
      RAISE EXCEPTION 'chat_quota_exceeded: % / % on plan %', v_count, v_chat_limit, v_plan_key
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS ai_actions_enforce_quota ON public.ai_actions;
CREATE TRIGGER ai_actions_enforce_quota
  BEFORE INSERT ON public.ai_actions
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_ai_action_quota();

NOTIFY pgrst, 'reload schema';
