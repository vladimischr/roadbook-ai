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

// Loose typing — the real shape is enforced by the system prompt and
// consumed by the preview page.
export type RoadbookContent = Record<string, any>;

export async function callClaudeAPI(
  form: RoadbookFormData,
): Promise<RoadbookContent> {
  const resp = await fetch("/api/generate-roadbook", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(form),
  });

  if (!resp.ok) {
    let message = `Erreur ${resp.status}`;
    try {
      const j = await resp.json();
      if (j?.error) message = j.error;
    } catch {
      /* ignore */
    }
    throw new Error(message);
  }

  return (await resp.json()) as RoadbookContent;
}
