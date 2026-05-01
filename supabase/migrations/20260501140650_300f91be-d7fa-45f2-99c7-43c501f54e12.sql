-- 1. Add share_token column
ALTER TABLE public.roadbooks
  ADD COLUMN IF NOT EXISTS share_token UUID UNIQUE;

CREATE INDEX IF NOT EXISTS idx_roadbooks_share_token
  ON public.roadbooks(share_token)
  WHERE share_token IS NOT NULL;

-- 2. Function: regenerate_share_token (owner only)
CREATE OR REPLACE FUNCTION public.regenerate_share_token(p_roadbook_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_new_token UUID;
BEGIN
  SELECT user_id INTO v_user_id
  FROM public.roadbooks
  WHERE id = p_roadbook_id;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Roadbook not found';
  END IF;

  IF v_user_id <> auth.uid() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  v_new_token := gen_random_uuid();

  UPDATE public.roadbooks
  SET share_token = v_new_token
  WHERE id = p_roadbook_id;

  RETURN v_new_token;
END;
$$;

-- 3. Function: get_shared_roadbook (public, by token)
-- Returns content only if status is 'ready' or 'delivered'.
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
  content JSONB,
  status TEXT,
  updated_at TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
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
    r.content,
    r.status,
    r.updated_at
  FROM public.roadbooks r
  WHERE r.share_token = p_token
    AND r.status IN ('ready', 'delivered');
$$;

-- 4. Allow anonymous + authenticated to call get_shared_roadbook
GRANT EXECUTE ON FUNCTION public.get_shared_roadbook(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.regenerate_share_token(UUID) TO authenticated;