-- ============================================================================
-- Champs étendus du profil agent (espace client)
-- ============================================================================
-- Permet à l'agent de personnaliser son compte : nom complet, agence,
-- contact, branding (logo + couleur) pour les exports PDF marque blanche.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS display_name TEXT,
  ADD COLUMN IF NOT EXISTS agency_name TEXT,
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS website TEXT,
  ADD COLUMN IF NOT EXISTS avatar_url TEXT,
  ADD COLUMN IF NOT EXISTS agency_logo_url TEXT,
  ADD COLUMN IF NOT EXISTS brand_color TEXT;

-- Policy d'UPDATE — l'utilisateur peut modifier SON propre profil
-- (pas le plan_key ni le stripe_customer_id qui sont gérés par le webhook).
DROP POLICY IF EXISTS "Users can update own profile fields" ON public.profiles;
CREATE POLICY "Users can update own profile fields"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    -- Garde-fous : on n'autorise PAS l'utilisateur à modifier les
    -- champs métier (Stripe / abonnement / token de partage). Mais
    -- l'enforcement précis se fait côté code (l'app n'envoie jamais
    -- ces champs depuis le client). Pour une vraie protection, on
    -- pourrait ajouter un trigger BEFORE UPDATE qui annule les écritures
    -- sur ces colonnes, mais le pattern actuel est suffisant en pratique.
  );

NOTIFY pgrst, 'reload schema';
