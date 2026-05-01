import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  return { session, user, loading };
}

/* ---------- Magic link (lien sans mot de passe) ---------- */

export async function sendMagicLink(email: string) {
  return supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${window.location.origin}/dashboard` },
  });
}

/* ---------- Email + mot de passe ---------- */

/**
 * Inscription avec email + mot de passe. Crée le user dans auth.users
 * et le profil associé (via le trigger DB on_auth_user_created).
 * Selon la config Supabase, peut nécessiter une confirmation email.
 */
export async function signUpWithPassword(email: string, password: string) {
  return supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${window.location.origin}/dashboard`,
    },
  });
}

/**
 * Connexion avec email + mot de passe. Retourne une session direct si
 * les credentials sont bons.
 */
export async function signInWithPassword(email: string, password: string) {
  return supabase.auth.signInWithPassword({ email, password });
}

/**
 * Demande un email de réinitialisation de mot de passe.
 * Le user reçoit un lien vers /reset-password.
 */
export async function sendPasswordReset(email: string) {
  return supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`,
  });
}

/**
 * Met à jour le mot de passe de l'utilisateur connecté (depuis le
 * profil) ou via le flow de reset (l'utilisateur a cliqué sur le lien
 * email et son URL contient un token).
 */
export async function updatePassword(newPassword: string) {
  return supabase.auth.updateUser({ password: newPassword });
}

/* ---------- Mise à jour de l'email ---------- */

export async function updateEmail(newEmail: string) {
  return supabase.auth.updateUser({ email: newEmail });
}

/* ---------- Sign out ---------- */

export async function signOut() {
  return supabase.auth.signOut();
}
