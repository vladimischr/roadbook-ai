-- ============================================================================
-- PROFILES
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  stripe_customer_id TEXT UNIQUE,
  stripe_subscription_id TEXT UNIQUE,
  plan_key TEXT NOT NULL DEFAULT 'free',
  plan_status TEXT NOT NULL DEFAULT 'active',
  current_period_end TIMESTAMPTZ,
  trial_ends_at TIMESTAMPTZ,
  cancel_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS display_name TEXT,
  ADD COLUMN IF NOT EXISTS agency_name TEXT,
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS website TEXT,
  ADD COLUMN IF NOT EXISTS avatar_url TEXT,
  ADD COLUMN IF NOT EXISTS agency_logo_url TEXT,
  ADD COLUMN IF NOT EXISTS brand_color TEXT;

CREATE INDEX IF NOT EXISTS idx_profiles_stripe_customer_id ON public.profiles(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_profiles_stripe_subscription_id ON public.profiles(stripe_subscription_id);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile fields" ON public.profiles;
CREATE POLICY "Users can update own profile fields"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

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

INSERT INTO public.profiles (id, email, plan_key, plan_status)
SELECT id, email, 'free', 'active'
FROM auth.users
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- SHARE TOKEN sur roadbooks
-- ============================================================================
ALTER TABLE public.roadbooks
  ADD COLUMN IF NOT EXISTS share_token UUID NOT NULL DEFAULT gen_random_uuid();

CREATE UNIQUE INDEX IF NOT EXISTS idx_roadbooks_share_token
  ON public.roadbooks(share_token);

CREATE OR REPLACE FUNCTION public.get_shared_roadbook(p_token UUID)
RETURNS TABLE (
  id UUID, client_name TEXT, destination TEXT, start_date DATE, end_date DATE,
  travelers_count INTEGER, traveler_profile TEXT, theme TEXT, budget_range TEXT,
  content JSONB, status TEXT, updated_at TIMESTAMPTZ
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT r.id, r.client_name, r.destination, r.start_date, r.end_date,
         r.travelers_count, r.traveler_profile, r.theme, r.budget_range,
         r.content, r.status, r.updated_at
  FROM public.roadbooks r
  WHERE r.share_token = p_token AND r.status IN ('ready', 'delivered');
$$;

GRANT EXECUTE ON FUNCTION public.get_shared_roadbook(UUID) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.regenerate_share_token(p_roadbook_id UUID)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user_id UUID;
  v_new_token UUID;
BEGIN
  SELECT user_id INTO v_user_id FROM public.roadbooks WHERE id = p_roadbook_id;
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Roadbook not found'; END IF;
  IF v_user_id <> auth.uid() THEN RAISE EXCEPTION 'Not authorized'; END IF;
  v_new_token := gen_random_uuid();
  UPDATE public.roadbooks SET share_token = v_new_token WHERE id = p_roadbook_id;
  RETURN v_new_token;
END;
$$;

GRANT EXECUTE ON FUNCTION public.regenerate_share_token(UUID) TO authenticated;

-- ============================================================================
-- ROADBOOK VIEWS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.roadbook_views (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  roadbook_id UUID NOT NULL REFERENCES public.roadbooks(id) ON DELETE CASCADE,
  viewed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  device_type TEXT,
  referrer TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_roadbook_views_roadbook_id_viewed_at
  ON public.roadbook_views(roadbook_id, viewed_at DESC);

ALTER TABLE public.roadbook_views ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners can read views of their roadbooks" ON public.roadbook_views;
CREATE POLICY "Owners can read views of their roadbooks"
  ON public.roadbook_views FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.roadbooks r WHERE r.id = roadbook_views.roadbook_id AND r.user_id = auth.uid()));

CREATE OR REPLACE VIEW public.roadbook_view_stats AS
SELECT r.id AS roadbook_id, r.user_id,
  COUNT(rv.id) AS view_count,
  MAX(rv.viewed_at) AS last_viewed_at,
  COUNT(*) FILTER (WHERE rv.device_type = 'mobile') AS mobile_count,
  COUNT(*) FILTER (WHERE rv.device_type = 'desktop') AS desktop_count
FROM public.roadbooks r
LEFT JOIN public.roadbook_views rv ON rv.roadbook_id = r.id
GROUP BY r.id, r.user_id;

GRANT SELECT ON public.roadbook_view_stats TO authenticated;

-- ============================================================================
-- STORAGE BUCKET: roadbook-photos
-- ============================================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('roadbook-photos', 'roadbook-photos', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public read roadbook photos" ON storage.objects;
CREATE POLICY "Public read roadbook photos"
  ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id = 'roadbook-photos');

DROP POLICY IF EXISTS "Authenticated upload to own folder" ON storage.objects;
CREATE POLICY "Authenticated upload to own folder"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'roadbook-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Authenticated update own photos" ON storage.objects;
CREATE POLICY "Authenticated update own photos"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'roadbook-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Authenticated delete own photos" ON storage.objects;
CREATE POLICY "Authenticated delete own photos"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'roadbook-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

-- ============================================================================
-- AI ACTIONS (crédits)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.ai_actions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  roadbook_id UUID REFERENCES public.roadbooks(id) ON DELETE SET NULL,
  credits_consumed INTEGER NOT NULL DEFAULT 1,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_actions_user_id_created_at
  ON public.ai_actions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_actions_roadbook_id
  ON public.ai_actions(roadbook_id);

ALTER TABLE public.ai_actions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own ai_actions" ON public.ai_actions;
CREATE POLICY "Users can read own ai_actions"
  ON public.ai_actions FOR SELECT TO authenticated
  USING (user_id = auth.uid());

NOTIFY pgrst, 'reload schema';