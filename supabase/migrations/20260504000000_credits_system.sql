-- ============================================================================
-- Système de crédits — log des appels IA
-- ============================================================================
-- Chaque appel à un modèle IA (génération, recalcul, import Excel, chat de
-- modification) est tracé ici. La consommation est calculée sur la fenêtre
-- de facturation courante et comparée au quota du plan.
--
-- 1 ligne = 1 crédit consommé.

CREATE TABLE IF NOT EXISTS public.ai_actions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- 'generate', 'recompute', 'import', 'chat'
  action_type TEXT NOT NULL,
  -- Lien optionnel vers le roadbook concerné (NULL pour les générations
  -- qui échouent avant la création d'un roadbook).
  roadbook_id UUID REFERENCES public.roadbooks(id) ON DELETE SET NULL,
  -- Coût en crédits — 1 par défaut, mais on garde la flexibilité
  -- d'introduire une pondération plus tard (ex: chat=0.5).
  credits_consumed INTEGER NOT NULL DEFAULT 1,
  -- Métadonnées libres (commande chat, tokens consommés Anthropic, etc.)
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_actions_user_id_created_at
  ON public.ai_actions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_actions_roadbook_id
  ON public.ai_actions(roadbook_id);

ALTER TABLE public.ai_actions ENABLE ROW LEVEL SECURITY;

-- Lecture : seul le owner voit ses propres actions
DROP POLICY IF EXISTS "Users can read own ai_actions" ON public.ai_actions;
CREATE POLICY "Users can read own ai_actions"
  ON public.ai_actions FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Insertion : faite uniquement par le service-role depuis les API routes.
-- Pas de policy d'INSERT pour les utilisateurs (bypass via supabaseAdmin).
