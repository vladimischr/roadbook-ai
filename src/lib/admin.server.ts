// ============================================================================
// Helper admin — vérifie qu'un user est admin
// ============================================================================
// Stratégie :
//   1. Vérifie la table admin_roles (autorité finale, modifiable sans redeploy)
//   2. Fallback sur ADMIN_EMAILS env var (bootstrap : permet au premier admin
//      de se logger même si la table est vide post-migration initiale)
//
// Cf. migration 20260606000000_admin_roles.sql

import { supabaseAdmin } from "@/integrations/supabase/client.server";

/**
 * Retourne `true` si le user est admin selon la DB ou (fallback) l'env var.
 * Tolère l'absence de la table (migration pas tournée) : on retombe sur
 * l'env var sans crasher.
 */
export async function isAdminUser(
  userId: string | null | undefined,
  email: string | null | undefined,
): Promise<boolean> {
  if (!userId && !email) return false;

  // 1. DB authority
  if (userId) {
    try {
      const { data, error } = await supabaseAdmin
        .from("admin_roles")
        .select("user_id")
        .eq("user_id", userId)
        .maybeSingle();
      if (!error && data) return true;
      // Si error et code est "table doesn't exist", on continue silencieusement
    } catch {
      // Table absente → fallback env
    }
  }

  // 2. Bootstrap fallback : ADMIN_EMAILS env var
  if (email) {
    const list = (process.env.ADMIN_EMAILS || "")
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);
    if (list.includes(email.toLowerCase())) return true;
  }

  return false;
}
