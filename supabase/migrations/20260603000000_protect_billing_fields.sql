-- ============================================================================
-- Sécurité — empêcher les users de modifier leurs propres champs billing
-- ============================================================================
-- La policy d'UPDATE actuelle sur `profiles` autorise l'utilisateur à éditer
-- toutes les colonnes (display_name, agency_name, etc.). En théorie, le code
-- client n'envoie jamais les champs billing dans son UPDATE — mais un user
-- malveillant qui appelle Supabase JS directement avec son JWT pourrait
-- s'auto-upgrade :
--
--   await supabase.from('profiles').update({ plan_key: 'atelier' }).eq('id', userId)
--
-- Le RLS l'autorise (auth.uid() = id). Pour garantir l'intégrité, on installe
-- un trigger BEFORE UPDATE qui REMPLACE les valeurs des champs billing par
-- celles d'origine. Le webhook Stripe (qui passe par supabaseAdmin / service
-- role) bypass ce trigger car SECURITY DEFINER ne s'applique qu'aux user
-- requests RLS-restricted.
--
-- Conséquence : seul le webhook Stripe peut modifier plan_key, plan_status,
-- stripe_*, current_period_end, trial_ends_at, cancel_at.

CREATE OR REPLACE FUNCTION public.protect_profile_billing_fields()
RETURNS TRIGGER AS $$
BEGIN
  -- Si la requête vient du service_role (webhook Stripe, scripts admin),
  -- auth.uid() est null. On laisse passer.
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  -- Sinon (requête user authentifié via RLS), on force les champs billing
  -- à rester ceux d'origine — le user ne peut pas les modifier.
  NEW.plan_key := OLD.plan_key;
  NEW.plan_status := OLD.plan_status;
  NEW.stripe_customer_id := OLD.stripe_customer_id;
  NEW.stripe_subscription_id := OLD.stripe_subscription_id;
  NEW.current_period_end := OLD.current_period_end;
  NEW.trial_ends_at := OLD.trial_ends_at;
  NEW.cancel_at := OLD.cancel_at;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS profiles_protect_billing ON public.profiles;
CREATE TRIGGER profiles_protect_billing
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_profile_billing_fields();

NOTIFY pgrst, 'reload schema';
