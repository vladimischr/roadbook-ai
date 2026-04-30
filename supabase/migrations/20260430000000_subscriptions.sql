-- ============================================================================
-- Profils utilisateurs + état d'abonnement Stripe
-- ============================================================================
-- Table 1:1 avec auth.users qui stocke le plan actuel et les ids Stripe.
-- La source de vérité reste Stripe (le webhook synchronise vers cette table).
-- Indexée sur stripe_customer_id pour la lookup webhook (event → user).

CREATE TABLE public.profiles (
  id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  stripe_customer_id TEXT UNIQUE,
  stripe_subscription_id TEXT UNIQUE,
  -- 'free' | 'solo' | 'studio' | 'atelier'
  plan_key TEXT NOT NULL DEFAULT 'free',
  -- 'active' | 'trialing' | 'past_due' | 'canceled' | 'incomplete' | 'unpaid'
  plan_status TEXT NOT NULL DEFAULT 'active',
  current_period_end TIMESTAMPTZ,
  trial_ends_at TIMESTAMPTZ,
  -- Si l'utilisateur a annulé : la date à laquelle l'accès tombe (= current_period_end)
  cancel_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_profiles_stripe_customer_id ON public.profiles(stripe_customer_id);
CREATE INDEX idx_profiles_stripe_subscription_id ON public.profiles(stripe_subscription_id);

-- RLS : l'utilisateur lit son propre profil. Les écritures passent uniquement
-- par le webhook Stripe (service-role) — on ne donne pas de policy UPDATE
-- aux clients, exprès, pour qu'ils ne puissent pas se promouvoir au plan
-- supérieur en bidouillant la requête.
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

-- Trigger updated_at (réutilise la fonction déjà créée pour roadbooks)
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- Auto-création du profil à l'inscription
-- ============================================================================
-- Quand un nouvel utilisateur s'inscrit (via auth.users), un profil "free"
-- est créé automatiquement. Évite d'avoir à gérer un cas "profil manquant"
-- côté application.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, plan_key, plan_status)
  VALUES (NEW.id, NEW.email, 'free', 'active')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- Backfill : créer un profil "free" pour chaque utilisateur déjà inscrit
-- ============================================================================
-- Sans ça, les utilisateurs créés AVANT cette migration n'auront pas de
-- profil et le quota check renverra "introuvable" → erreur 500.

INSERT INTO public.profiles (id, email, plan_key, plan_status)
SELECT id, email, 'free', 'active'
FROM auth.users
ON CONFLICT (id) DO NOTHING;
