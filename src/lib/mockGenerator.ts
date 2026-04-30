// Real generator: calls our server route, which proxies to Anthropic Claude.
import { supabase } from "@/integrations/supabase/client";

export interface RoadbookFormData {
  client_name: string;
  destination: string;
  start_date?: string;
  end_date?: string;
  travelers_count?: number;
  traveler_profile?: string;
  theme?: string;
  budget_range?: string;
  travel_mode?: string;
  generation_mode: "ai" | "manual";
  agent_notes?: string;
  manual_steps?: { location: string; nights: number; activities: string }[];
}

// Legacy structured type — preserved for pdfExport / roadbook.$id consumers.
export interface RoadbookContent {
  cover: { title: string; subtitle: string; tagline: string };
  overview: string;
  days: {
    day: number;
    date?: string;
    location: string;
    title: string;
    description: string;
    activities: string[];
  }[];
  accommodations: {
    name: string;
    location: string;
    nights: number;
    notes: string;
  }[];
  contacts: { label: string; value: string }[];
  tips: string[];
}

// The shape returned by Claude is enforced by the system prompt and consumed
// directly by the preview page. We keep it loose here.
export type GeneratedRoadbook = Record<string, any>;

export async function callClaudeAPI(
  form: RoadbookFormData,
): Promise<GeneratedRoadbook> {
  // Récupère le bearer token de la session pour authentifier l'appel
  // côté serveur (sinon le route répond 401 — la route est désormais
  // gardée pour empêcher les abus du quota Anthropic).
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) {
    throw new Error("Session expirée. Reconnecte-toi pour générer un roadbook.");
  }

  const res = await fetch("/api/generate-roadbook", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(form),
  });

  const text = await res.text();
  console.log("Réponse serveur brute:", text, "Status:", res.status);

  if (!res.ok) {
    throw new Error(
      "Serveur a retourné " + res.status + ": " + text.substring(0, 500),
    );
  }

  try {
    return JSON.parse(text) as GeneratedRoadbook;
  } catch {
    throw new Error("JSON invalide reçu: " + text.substring(0, 500));
  }
}
