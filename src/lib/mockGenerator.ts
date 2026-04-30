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

  // Le serveur renvoie toujours du JSON, même en erreur — on essaie de
  // récupérer le message lisible plutôt que d'afficher le texte brut.
  let parsed: unknown = null;
  try {
    parsed = JSON.parse(text);
  } catch {
    /* fallthrough — sera traité plus bas */
  }

  if (!res.ok) {
    const msg =
      (parsed && typeof parsed === "object" && (parsed as any).error) ||
      text.substring(0, 500);
    const code =
      parsed && typeof parsed === "object"
        ? ((parsed as any).code as string | undefined)
        : undefined;
    const err = new Error(String(msg)) as Error & {
      code?: string;
      status?: number;
    };
    err.code = code;
    err.status = res.status;
    throw err;
  }

  if (!parsed || typeof parsed !== "object") {
    throw new Error("Réponse invalide du serveur (JSON manquant).");
  }

  const roadbook = parsed as GeneratedRoadbook;
  if (!Array.isArray(roadbook.days) || roadbook.days.length === 0) {
    throw new Error(
      "L'IA a renvoyé un roadbook sans étapes. Réessaye dans quelques secondes.",
    );
  }
  return roadbook;
}
