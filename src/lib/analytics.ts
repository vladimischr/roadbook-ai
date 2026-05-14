// ============================================================================
// src/lib/analytics.ts — Service d'instrumentation PostHog typesafe
// ============================================================================
//
// Usage :
//   import { track, identifyUser, resetUser } from "@/lib/analytics";
//
//   track("signup_completed", { method: "email" });
//   identifyUser(user.id, { email: user.email, plan_key: "free" });
//   resetUser(); // au logout
//
// Conventions :
//   - Events en snake_case
//   - Properties en snake_case
//   - Pas de PII gratuite (email envoyé seulement quand utile pour funnels)
// ============================================================================

import posthog from "posthog-js";
import { initPostHog } from "./posthog-init";

// Initialise PostHog au premier import du module (côté client uniquement)
if (typeof window !== "undefined") {
  initPostHog();
}

// ============================================================================
// Types — Schéma strict des events et de leurs propriétés
// ============================================================================

export type PlanKey = "free" | "solo" | "studio" | "atelier";
export type SubscriptionStatus = "active" | "trialing" | "past_due" | "canceled" | "incomplete";
export type ExportType = "pdf_watermarked" | "pdf_clean" | "pdf_branded";

export interface RoadbookProps {
  roadbook_id?: string;
  destination?: string;
  days_count?: number;
}

export interface UserProps {
  email?: string;
  plan_key?: PlanKey;
  subscription_status?: SubscriptionStatus;
  created_at?: string;
}

// Schéma des events et de leurs propriétés autorisées (≈ contrat)
export interface EventSchema {
  signup_completed: { method: "email" | "google" | "magic_link"; plan_key: PlanKey };
  first_roadbook_started: RoadbookProps & { source: "blank" | "import_excel" | "import_notion" };
  first_roadbook_completed: RoadbookProps;
  pdf_exported: RoadbookProps & { export_type: ExportType };
  roadbook_shared: RoadbookProps & { channel: "link" | "email" | "copy_url" };
  paywall_seen: { trigger: "quota_reached" | "premium_feature" | "manual_open"; current_plan: PlanKey };
  checkout_started: { target_plan: PlanKey; billing: "monthly" | "annual" };
  subscription_active: { plan_key: PlanKey; billing: "monthly" | "annual"; amount_cents: number };
}

export type EventName = keyof EventSchema;

// ============================================================================
// API publique
// ============================================================================

/**
 * Track un event PostHog avec validation de schéma au compile time.
 *
 * Exemple :
 *   track("signup_completed", { method: "email", plan_key: "free" });
 */
export function track<E extends EventName>(event: E, props: EventSchema[E]): void {
  if (typeof window === "undefined") return; // safe SSR

  // Pas d'envoi en dev (sauf si VITE_POSTHOG_DEBUG=true)
  if (import.meta.env.DEV && !import.meta.env.VITE_POSTHOG_DEBUG) {
    // eslint-disable-next-line no-console
    console.info(`[analytics] (dev, not sent) ${event}`, props);
    return;
  }

  try {
    posthog.capture(event, props as Record<string, unknown>);
  } catch (err) {
    // Never break the app
    // eslint-disable-next-line no-console
    console.warn("[analytics] capture failed", err);
  }
}

/**
 * Identify un user (à appeler après signup ou login).
 * Lie tous les events ultérieurs à cet user_id côté PostHog.
 *
 * Note : appelle aussi resetUser() avant si tu changes d'user dans la session
 * (cas rare).
 */
export function identifyUser(userId: string, props?: UserProps): void {
  if (typeof window === "undefined") return;

  if (import.meta.env.DEV && !import.meta.env.VITE_POSTHOG_DEBUG) {
    // eslint-disable-next-line no-console
    console.info(`[analytics] (dev, not sent) identify ${userId}`, props);
    return;
  }

  try {
    posthog.identify(userId, props as Record<string, unknown>);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn("[analytics] identify failed", err);
  }
}

/**
 * À appeler au logout. Détache l'user des futurs events.
 */
export function resetUser(): void {
  if (typeof window === "undefined") return;
  try {
    posthog.reset();
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn("[analytics] reset failed", err);
  }
}

/**
 * Set ou update des propriétés permanentes sur l'user.
 * Utile quand le plan change (ex: subscription_active → maj plan_key).
 */
export function setUserProps(props: UserProps): void {
  if (typeof window === "undefined") return;

  if (import.meta.env.DEV && !import.meta.env.VITE_POSTHOG_DEBUG) {
    // eslint-disable-next-line no-console
    console.info(`[analytics] (dev, not sent) set user props`, props);
    return;
  }

  try {
    posthog.setPersonProperties(props as Record<string, unknown>);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn("[analytics] setPersonProperties failed", err);
  }
}

/**
 * Helper pour les page views manuelles si TanStack Router n'autopilote pas.
 */
export function trackPageView(path?: string): void {
  if (typeof window === "undefined") return;

  if (import.meta.env.DEV && !import.meta.env.VITE_POSTHOG_DEBUG) return;

  try {
    posthog.capture("$pageview", path ? { $current_url: path } : undefined);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn("[analytics] pageview failed", err);
  }
}
