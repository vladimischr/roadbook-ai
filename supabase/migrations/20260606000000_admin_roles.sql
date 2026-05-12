-- ============================================================================
-- Table admin_roles — RBAC en base au lieu de liste d'emails en env var
-- ============================================================================
-- Permet d'ajouter/retirer un admin sans redéployer, et de tracer qui est
-- admin et depuis quand. La liste ADMIN_EMAILS reste utilisée comme
-- "bootstrap" au premier déploiement (premier admin amorcé via env), mais
-- l'autorité finale est cette table.
--
-- Le code côté serveur (api/admin-users.ts, etc.) doit vérifier d'abord cette
-- table, puis fallback sur ADMIN_EMAILS si l'utilisateur n'y est pas (pour
-- ne pas se locker out au premier déploiement).

CREATE TABLE IF NOT EXISTS public.admin_roles (
  user_id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  -- "admin" pour l'instant ; on garde la flexibilité d'ajouter "moderator"
  -- ou "billing_admin" plus tard.
  role TEXT NOT NULL DEFAULT 'admin',
  granted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_admin_roles_role ON public.admin_roles(role);

ALTER TABLE public.admin_roles ENABLE ROW LEVEL SECURITY;

-- Lecture : un admin peut voir la liste des admins.
DROP POLICY IF EXISTS "Admins can read admin_roles" ON public.admin_roles;
CREATE POLICY "Admins can read admin_roles"
  ON public.admin_roles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_roles a
      WHERE a.user_id = auth.uid()
    )
  );

-- Pas de policy INSERT/UPDATE/DELETE pour authenticated : ces opérations
-- passent par service_role (script admin ou endpoint API protégé).

NOTIFY pgrst, 'reload schema';
