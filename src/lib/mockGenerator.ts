// Placeholder AI generator. Replace with real Claude API call later.
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

export interface RoadbookContent {
  cover: { title: string; subtitle: string; tagline: string };
  overview: string;
  days: { day: number; date?: string; location: string; title: string; description: string; activities: string[] }[];
  accommodations: { name: string; location: string; nights: number; notes: string }[];
  contacts: { label: string; value: string }[];
  tips: string[];
}

function daysBetween(a?: string, b?: string): number {
  if (!a || !b) return 7;
  const d = Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000);
  return Math.max(1, d || 7);
}

export async function callClaudeAPI(form: RoadbookFormData): Promise<RoadbookContent> {
  await new Promise((r) => setTimeout(r, 2200));

  const length = form.manual_steps?.length
    ? form.manual_steps.reduce((acc, s) => acc + (s.nights || 1), 0)
    : daysBetween(form.start_date, form.end_date);

  const themeLabel = form.theme || "bespoke journey";

  const days =
    form.generation_mode === "manual" && form.manual_steps?.length
      ? form.manual_steps.flatMap((s, idx) => {
          return Array.from({ length: Math.max(1, s.nights) }, (_, i) => ({
            day: idx + i + 1,
            location: s.location,
            title: `${s.location} — Day ${i + 1}`,
            description: `Discover ${s.location} at your own pace.`,
            activities: s.activities.split(",").map((a) => a.trim()).filter(Boolean),
          })).map((d, k) => ({ ...d, day: k + 1 }));
        })
      : Array.from({ length: length }, (_, i) => ({
          day: i + 1,
          location: form.destination,
          title: `Day ${i + 1} — ${form.destination}`,
          description: `A carefully curated day in ${form.destination}, blending ${themeLabel.toLowerCase()} experiences with moments of relaxation.`,
          activities: [
            "Morning guided experience",
            "Lunch at a hand-picked local spot",
            "Afternoon at leisure or optional excursion",
            "Sunset moment & dinner",
          ],
        }));

  return {
    cover: {
      title: `${form.destination}`,
      subtitle: `A custom journey for ${form.client_name}`,
      tagline: `${themeLabel} • ${form.travelers_count || 2} travelers`,
    },
    overview: `This ${length}-day journey through ${form.destination} has been crafted exclusively for ${form.client_name}. It balances ${themeLabel.toLowerCase()} highlights with authentic local encounters, hand-picked accommodations, and the kind of seamless logistics that let you simply enjoy the trip.${form.agent_notes ? `\n\nNote from your travel designer: ${form.agent_notes}` : ""}`,
    days,
    accommodations: (form.manual_steps?.length
      ? form.manual_steps
      : [{ location: form.destination, nights: length, activities: "" }]
    ).map((s) => ({
      name: `Boutique stay in ${s.location}`,
      location: s.location,
      nights: s.nights || length,
      notes: "Selected for character, location, and outstanding service.",
    })),
    contacts: [
      { label: "Your travel designer", value: "Available 24/7 during your trip" },
      { label: "Local concierge", value: "+ contact provided on arrival" },
      { label: "Emergency assistance", value: "+ contact provided on arrival" },
    ],
    tips: [
      `Best season cues for ${form.destination} have been factored into pacing.`,
      "Pack layers — mornings and evenings are cooler than midday.",
      "Tip in local currency where possible.",
      "Keep a digital and printed copy of this roadbook handy.",
    ],
  };
}
