// Real generator: calls our server route, which proxies to Anthropic Claude.
export interface RoadbookFormData {
  client_name: string;
  destination: string;
  start_date?: string;
  end_date?: string;
  travelers_count?: number;
  traveler_profile?: string;
  theme?: string;
  budget_range?: string;
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
  const resp = await fetch("/api/generate-roadbook", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(form),
  });

  if (!resp.ok) {
    let message = "Erreur génération roadbook";
    try {
      const j = await resp.json();
      if (j?.error) message = j.error;
    } catch {
      /* ignore */
    }
    throw new Error(message);
  }

  try {
    return (await resp.json()) as GeneratedRoadbook;
  } catch {
    throw new Error("Réponse invalide de l'IA, réessaie");
  }
}
