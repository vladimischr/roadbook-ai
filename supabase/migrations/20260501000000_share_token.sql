-- ============================================================================
-- Token de partage public — chaque roadbook a un token unique pour
-- permettre l'accès en lecture seule via /voyage/{token} sans auth.
-- ============================================================================

-- Ajoute la colonne share_token (UUID, unique, généré automatiquement à la
-- création). On utilise gen_random_uuid() pour avoir 10^36 possibilités —
-- impossible à deviner par bruteforce.
ALTER TABLE public.roadbooks
ADD COLUMN IF NOT EXISTS share_token UUID NOT NULL DEFAULT gen_random_uuid();

-- Backfill — donne un token aux roadbooks créés AVANT cette migration
-- (le DEFAULT ne s'applique qu'aux nouvelles lignes).
UPDATE public.roadbooks
SET share_token = gen_random_uuid()
WHERE share_token IS NULL;

-- Index unique sur le token (utilisé par le webhook public pour lookup).
CREATE UNIQUE INDEX IF NOT EXISTS idx_roadbooks_share_token
  ON public.roadbooks(share_token);

-- ============================================================================
-- Vue publique restreinte (sécurisée par token)
-- ============================================================================
-- On expose une fonction RPC qui retourne UNIQUEMENT le contenu (pas le
-- user_id ni les métadonnées internes) si le token correspond. Comme cette
-- fonction est SECURITY DEFINER, elle bypasse RLS proprement — ce qui est
-- nécessaire vu qu'on accepte des appels non authentifiés.

CREATE OR REPLACE FUNCTION public.get_shared_roadbook(p_token UUID)
RETURNS TABLE (
  id UUID,
  client_name TEXT,
  destination TEXT,
  start_date DATE,
  end_date DATE,
  travelers_count INTEGER,
  traveler_profile TEXT,
  theme TEXT,
  budget_range TEXT,
  generation_mode TEXT,
  content JSONB,
  status TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    r.id,
    r.client_name,
    r.destination,
    r.start_date,
    r.end_date,
    r.travelers_count,
    r.traveler_profile,
    r.theme,
    r.budget_range,
    r.generation_mode,
    r.content,
    r.status,
    r.created_at,
    r.updated_at
  FROM public.roadbooks r
  WHERE r.share_token = p_token
    -- On ne sert pas les brouillons en lien public — l'agent doit
    -- explicitement passer le roadbook en "ready" pour le partager.
    AND r.status IN ('ready', 'delivered');
END;
$$;

-- Permission : autoriser appel par TOUS (anon + authenticated)
GRANT EXECUTE ON FUNCTION public.get_shared_roadbook(UUID) TO anon, authenticated;

-- ============================================================================
-- Fonction de régénération du token (pour invalider d'anciens liens)
-- ============================================================================
-- Utilisée par le bouton "Régénérer le lien" dans l'UI. On laisse RLS
-- protéger l'accès — seul le owner peut régénérer son propre token.

CREATE OR REPLACE FUNCTION public.regenerate_share_token(p_roadbook_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  new_token UUID;
BEGIN
  new_token := gen_random_uuid();
  UPDATE public.roadbooks
  SET share_token = new_token
  WHERE id = p_roadbook_id
    AND user_id = auth.uid();  -- Sécurité : seul le owner peut régénérer

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Roadbook introuvable ou accès refusé';
  END IF;

  RETURN new_token;
END;
$$;

GRANT EXECUTE ON FUNCTION public.regenerate_share_token(UUID) TO authenticated;
