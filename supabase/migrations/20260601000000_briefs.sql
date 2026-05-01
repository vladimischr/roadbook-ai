-- ============================================================================
-- Briefs clients — formulaire à envoyer au voyageur final
-- ============================================================================
-- Le travel designer crée un brief avec un token public unique. Il envoie
-- le lien getroadbook.com/brief/<token> à son client. Le client remplit le
-- formulaire (sans compte). Le designer voit les réponses et peut générer
-- un roadbook pré-rempli avec toutes les bonnes infos (destination, dates,
-- style, budget, intérêts, contraintes).
--
-- Sécurité : pas de policy publique. L'accès public passe uniquement par
-- les endpoints serveur (supabaseAdmin) qui valident le token.

CREATE TABLE IF NOT EXISTS public.briefs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token TEXT UNIQUE NOT NULL,
  designer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_name TEXT,
  client_email TEXT,
  destination_hint TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  answers JSONB NOT NULL DEFAULT '{}'::jsonb,
  roadbook_id UUID REFERENCES public.roadbooks(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  CONSTRAINT briefs_status_check
    CHECK (status IN ('pending', 'completed', 'used'))
);

CREATE INDEX IF NOT EXISTS idx_briefs_designer_id ON public.briefs(designer_id);
CREATE INDEX IF NOT EXISTS idx_briefs_token ON public.briefs(token);
CREATE INDEX IF NOT EXISTS idx_briefs_status ON public.briefs(status);

ALTER TABLE public.briefs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Designers see own briefs"
  ON public.briefs FOR SELECT TO authenticated
  USING (auth.uid() = designer_id);

CREATE POLICY "Designers create own briefs"
  ON public.briefs FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = designer_id);

CREATE POLICY "Designers update own briefs"
  ON public.briefs FOR UPDATE TO authenticated
  USING (auth.uid() = designer_id);

CREATE POLICY "Designers delete own briefs"
  ON public.briefs FOR DELETE TO authenticated
  USING (auth.uid() = designer_id);
