-- ============================================================================
-- CRM clients — fiche client liée aux roadbooks et briefs
-- ============================================================================
-- Le travel designer gère son carnet d'adresses : chaque client a une fiche
-- avec contact, tags, notes privées. Les roadbooks et briefs sont liés à
-- une fiche client (FK nullable pour rétrocompat avec l'existant).
--
-- Cas d'usage clé : "La famille Dupont revient pour leur 3ème voyage" → le
-- designer voit en 1 clic leur historique, leurs préférences, leurs notes.

CREATE TABLE IF NOT EXISTS public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  city TEXT,
  country TEXT,
  tags TEXT[] NOT NULL DEFAULT '{}',
  notes TEXT,
  vip BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_clients_user_id ON public.clients(user_id);
CREATE INDEX IF NOT EXISTS idx_clients_email ON public.clients(email);
-- Index GIN pour recherche par tags
CREATE INDEX IF NOT EXISTS idx_clients_tags ON public.clients USING gin(tags);

-- Lien optionnel : un roadbook peut être attaché à une fiche client
ALTER TABLE public.roadbooks
  ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_roadbooks_client_id ON public.roadbooks(client_id);

-- Lien optionnel : un brief peut être attaché à une fiche client
ALTER TABLE public.briefs
  ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_briefs_client_id ON public.briefs(client_id);

ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Designers see own clients" ON public.clients;
CREATE POLICY "Designers see own clients"
  ON public.clients FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Designers create own clients" ON public.clients;
CREATE POLICY "Designers create own clients"
  ON public.clients FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Designers update own clients" ON public.clients;
CREATE POLICY "Designers update own clients"
  ON public.clients FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Designers delete own clients" ON public.clients;
CREATE POLICY "Designers delete own clients"
  ON public.clients FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Trigger pour updated_at automatique
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS clients_set_updated_at ON public.clients;
CREATE TRIGGER clients_set_updated_at
  BEFORE UPDATE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

NOTIFY pgrst, 'reload schema';
