-- ============================================================================
-- Programme d'affiliation Roadbook AI
-- ============================================================================
-- Modèle : un affilié partage un code (ex: SOPHIE25). Quand un user s'inscrit
-- avec ?ref=SOPHIE25, on stocke le code dans son profil. Si ce user souscrit
-- ensuite à un plan payant, l'affilié touche 30% du MRR pendant 12 mois.
--
-- Tables :
--  - affiliates : les codes (slug, owner, taux de commission, statut)
--  - affiliate_conversions : chaque paiement Stripe d'un filleul -> commission
--                            due à l'affilié (snapshot au moment du paiement
--                            pour résister aux changements de taux)
--
-- Colonnes ajoutées à profiles :
--  - referred_by_code : le code utilisé au signup (FK vers affiliates.code)
--  - referred_at       : timestamp du signup attribué
--
-- Sécurité :
--  - RLS strict : l'affilié ne voit QUE ses propres données
--  - Les codes sont créés UNIQUEMENT côté serveur (admin endpoint)
--  - Les commissions sont calculées dans le webhook Stripe (service-role)

-- ============================================================================
-- Table affiliates
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.affiliates (
  code TEXT PRIMARY KEY,           -- ex: "SOPHIE25" (slug en majuscules)
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- nullable car
                                                              -- l'affilié peut
                                                              -- ne pas avoir
                                                              -- de compte (ex :
                                                              -- influenceur)
  name TEXT NOT NULL,              -- "Sophie Travel"
  email TEXT NOT NULL,             -- pour payouts manuels au début
  -- 'pending' : demande reçue, en attente de validation admin
  -- 'active'  : code généré et utilisable
  -- 'paused'  : ancien affilié qu'on a mis en pause
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'active', 'paused')),
  -- Taux de commission en pourcentage (30 = 30%). On garde une colonne
  -- par affilié pour gérer les cas particuliers (ex : 50% pour un gros
  -- influenceur). Défaut : 30% récurrent 12 mois.
  commission_rate INTEGER NOT NULL DEFAULT 30
    CHECK (commission_rate >= 0 AND commission_rate <= 100),
  -- Durée en mois pendant laquelle l'affilié touche la commission.
  -- Défaut : 12 mois. 0 = à vie. NULL = paiement unique au signup.
  commission_months INTEGER NOT NULL DEFAULT 12,
  -- Notes admin (pourquoi on a accepté, source, etc.)
  notes TEXT,
  -- Pour le formulaire de candidature : "qui es-tu, pourquoi tu peux nous aider"
  pitch TEXT,
  -- Réseaux sociaux pour vérifier l'audience
  social_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_affiliates_user_id ON public.affiliates(user_id);
CREATE INDEX IF NOT EXISTS idx_affiliates_status ON public.affiliates(status);
CREATE INDEX IF NOT EXISTS idx_affiliates_email ON public.affiliates(email);

ALTER TABLE public.affiliates ENABLE ROW LEVEL SECURITY;

-- Un affilié peut voir SA propre ligne (pour le dashboard /affiliate/dashboard)
DROP POLICY IF EXISTS "Affiliates can view their own row" ON public.affiliates;
CREATE POLICY "Affiliates can view their own row"
  ON public.affiliates FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Lecture publique des codes ACTIFS uniquement, et SEULEMENT le code +
-- name pour valider une URL ?ref=XXX côté client sans exposer toute la
-- table. (En pratique on valide côté serveur dans l'endpoint d'attribution,
-- donc cette policy est défensive.)
-- => Pas de policy SELECT pour anon, on passe par service-role.

-- Les admins peuvent voir toutes les lignes
DROP POLICY IF EXISTS "Admins can view all affiliates" ON public.affiliates;
CREATE POLICY "Admins can view all affiliates"
  ON public.affiliates FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.admin_roles WHERE user_id = auth.uid())
  );

-- Pas de policy INSERT/UPDATE/DELETE : tout passe par service_role (admin
-- endpoint + webhook Stripe).

-- ============================================================================
-- Colonnes profiles : qui a parrainé qui
-- ============================================================================
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS referred_by_code TEXT
    REFERENCES public.affiliates(code) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS referred_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_profiles_referred_by_code
  ON public.profiles(referred_by_code)
  WHERE referred_by_code IS NOT NULL;

-- ============================================================================
-- Table affiliate_conversions
-- ============================================================================
-- Chaque paiement Stripe d'un filleul génère une ligne ici, avec un snapshot
-- du taux et du montant. C'est la source de vérité pour les payouts.
--
-- On stocke `commission_amount_cents` directement (pas un % à recalculer)
-- pour résister aux changements futurs du taux de l'affilié.
CREATE TABLE IF NOT EXISTS public.affiliate_conversions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_code TEXT NOT NULL
    REFERENCES public.affiliates(code) ON DELETE CASCADE,
  referred_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_invoice_id TEXT UNIQUE NOT NULL,     -- idempotence
  stripe_subscription_id TEXT,
  -- Montant total du paiement filleul (en centimes EUR, ex : 2900 pour 29€)
  invoice_amount_cents INTEGER NOT NULL,
  -- Commission due à l'affilié (snapshot au moment du paiement)
  commission_amount_cents INTEGER NOT NULL,
  commission_rate INTEGER NOT NULL,
  -- Numéro de paiement dans la séquence (1, 2, 3...) — utile pour savoir
  -- combien de mois il reste avant la fin de la période de commission
  payment_number INTEGER NOT NULL DEFAULT 1,
  paid_to_affiliate BOOLEAN NOT NULL DEFAULT FALSE,
  paid_at TIMESTAMPTZ,
  paid_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_aff_conv_code
  ON public.affiliate_conversions(affiliate_code);
CREATE INDEX IF NOT EXISTS idx_aff_conv_unpaid
  ON public.affiliate_conversions(affiliate_code, paid_to_affiliate)
  WHERE paid_to_affiliate = FALSE;
CREATE INDEX IF NOT EXISTS idx_aff_conv_user
  ON public.affiliate_conversions(referred_user_id);

ALTER TABLE public.affiliate_conversions ENABLE ROW LEVEL SECURITY;

-- L'affilié voit SES propres conversions (via le code dont il est owner)
DROP POLICY IF EXISTS "Affiliates can view their conversions" ON public.affiliate_conversions;
CREATE POLICY "Affiliates can view their conversions"
  ON public.affiliate_conversions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.affiliates a
      WHERE a.code = affiliate_code AND a.user_id = auth.uid()
    )
  );

-- Les admins voient tout
DROP POLICY IF EXISTS "Admins can view all conversions" ON public.affiliate_conversions;
CREATE POLICY "Admins can view all conversions"
  ON public.affiliate_conversions FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.admin_roles WHERE user_id = auth.uid())
  );

-- Pas de policy INSERT/UPDATE/DELETE : tout passe par service_role.

NOTIFY pgrst, 'reload schema';
