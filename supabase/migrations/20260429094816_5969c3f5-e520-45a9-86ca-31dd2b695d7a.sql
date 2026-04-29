
CREATE TABLE public.roadbooks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_name TEXT NOT NULL,
  destination TEXT NOT NULL,
  start_date DATE,
  end_date DATE,
  travelers_count INTEGER DEFAULT 2,
  traveler_profile TEXT,
  theme TEXT,
  budget_range TEXT,
  generation_mode TEXT NOT NULL DEFAULT 'ai',
  agent_notes TEXT,
  content JSONB,
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.roadbooks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own roadbooks"
  ON public.roadbooks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own roadbooks"
  ON public.roadbooks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own roadbooks"
  ON public.roadbooks FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own roadbooks"
  ON public.roadbooks FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX idx_roadbooks_user_id ON public.roadbooks(user_id);
CREATE INDEX idx_roadbooks_created_at ON public.roadbooks(created_at DESC);

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_roadbooks_updated_at
  BEFORE UPDATE ON public.roadbooks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
