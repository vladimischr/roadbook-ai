-- admin_roles: server-only authority for admin access
CREATE TABLE IF NOT EXISTS public.admin_roles (
  user_id UUID NOT NULL PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_roles ENABLE ROW LEVEL SECURITY;

-- No policies: only the service role (which bypasses RLS) reads/writes this table.

-- stripe_webhook_events: idempotency log for Stripe webhooks
CREATE TABLE IF NOT EXISTS public.stripe_webhook_events (
  event_id TEXT NOT NULL PRIMARY KEY,
  event_type TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.stripe_webhook_events ENABLE ROW LEVEL SECURITY;

-- No policies: only the service role writes here from the webhook handler.
