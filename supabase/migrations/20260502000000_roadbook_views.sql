-- ============================================================================
-- Tracking des vues sur les liens publics /voyage/{token}
-- ============================================================================
-- Stocke chaque ouverture d'un roadbook partagé par un voyageur. Permet à
-- l'agent de voir : "vu N fois, dernière fois il y a X". Pas de fingerprint
-- agressif — juste un compteur agrégé.

CREATE TABLE IF NOT EXISTS public.roadbook_views (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  roadbook_id UUID NOT NULL REFERENCES public.roadbooks(id) ON DELETE CASCADE,
  viewed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- "mobile" ou "desktop" déduit côté serveur via User-Agent
  device_type TEXT,
  -- Optionnel : referrer (sans query string pour respecter la vie privée)
  referrer TEXT,
  -- IP NON stockée — on respecte le RGPD
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_roadbook_views_roadbook_id_viewed_at
  ON public.roadbook_views(roadbook_id, viewed_at DESC);

-- RLS : seul le owner du roadbook peut lire ses propres vues
ALTER TABLE public.roadbook_views ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners can read views of their roadbooks"
  ON public.roadbook_views;
CREATE POLICY "Owners can read views of their roadbooks"
  ON public.roadbook_views
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.roadbooks r
      WHERE r.id = roadbook_views.roadbook_id
        AND r.user_id = auth.uid()
    )
  );

-- L'INSERT est fait via service role (depuis l'API /api/track-view) — pas
-- besoin de policy d'insert pour les utilisateurs.

-- ============================================================================
-- Vue agrégée pour le dashboard (compteur par roadbook)
-- ============================================================================
CREATE OR REPLACE VIEW public.roadbook_view_stats AS
SELECT
  r.id AS roadbook_id,
  r.user_id,
  COUNT(rv.id) AS view_count,
  MAX(rv.viewed_at) AS last_viewed_at,
  COUNT(*) FILTER (WHERE rv.device_type = 'mobile') AS mobile_count,
  COUNT(*) FILTER (WHERE rv.device_type = 'desktop') AS desktop_count
FROM public.roadbooks r
LEFT JOIN public.roadbook_views rv ON rv.roadbook_id = r.id
GROUP BY r.id, r.user_id;

GRANT SELECT ON public.roadbook_view_stats TO authenticated;
