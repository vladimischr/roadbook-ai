-- ============================================================================
-- Idempotence du webhook Stripe — anti-double-traitement
-- ============================================================================
-- Stripe retry les webhooks jusqu'à 3 jours si on répond != 2xx, ou si le
-- worker timeout. Sans dédup, un même event peut être appliqué 2× → double
-- upgrade, doubles décompte de quotas, état inconsistant.
--
-- On insère chaque event.id dans cette table avant traitement. Si l'INSERT
-- échoue (unique violation), c'est qu'on a déjà traité l'event → on répond
-- 200 sans rien faire.
--
-- TTL : on garde 30 jours, suffisant pour couvrir la fenêtre de retry Stripe.
-- Un job cron pourra purger les vieilles lignes plus tard si nécessaire.

CREATE TABLE IF NOT EXISTS public.stripe_webhook_events (
  event_id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_stripe_webhook_events_processed_at
  ON public.stripe_webhook_events(processed_at DESC);

ALTER TABLE public.stripe_webhook_events ENABLE ROW LEVEL SECURITY;

-- Aucune policy : table accessible uniquement via service-role (webhook
-- Stripe). Bypass RLS via supabaseAdmin.

NOTIFY pgrst, 'reload schema';
