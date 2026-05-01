// ============================================================================
// Questions du brief client — single source of truth
// ============================================================================
// Utilisé côté formulaire public (/brief/$token) et côté résumé designer
// (/briefs et pré-remplissage IA dans /new).
//
// Pour ajouter/retirer une question, modifier ce fichier — pas besoin de
// migration tant qu'on reste sur du JSONB libre.

export type BriefQuestionType = "text" | "longtext" | "number" | "single" | "multi";

export interface BriefQuestionOption {
  value: string;
  label: string;
  hint?: string;
}

export interface BriefQuestion {
  id: string;
  type: BriefQuestionType;
  title: string;
  subtitle?: string;
  required?: boolean;
  options?: BriefQuestionOption[]; // pour single/multi
  placeholder?: string;
}

export const BRIEF_QUESTIONS: BriefQuestion[] = [
  {
    id: "destination",
    type: "text",
    title: "Où rêvez-vous d'aller ?",
    subtitle: "Pays, région, ou plusieurs destinations envisagées",
    required: true,
    placeholder: "Italie du Sud, Japon, road trip Patagonie…",
  },
  {
    id: "dates",
    type: "text",
    title: "Quand pensez-vous partir ?",
    subtitle: "Dates précises ou période approximative",
    required: true,
    placeholder: "Du 15 au 30 mai, ou « 2 semaines en septembre »",
  },
  {
    id: "duration",
    type: "number",
    title: "Combien de jours sur place ?",
    subtitle: "Durée du voyage hors temps de vol",
    placeholder: "10",
  },
  {
    id: "travelers",
    type: "single",
    title: "Avec qui voyagez-vous ?",
    options: [
      { value: "couple", label: "En couple" },
      { value: "family", label: "En famille (avec enfants)" },
      { value: "friends", label: "Entre amis" },
      { value: "solo", label: "Seul·e" },
      { value: "group", label: "En groupe (>5 personnes)" },
    ],
  },
  {
    id: "budget",
    type: "single",
    title: "Budget par personne, hors vols",
    options: [
      { value: "smart", label: "Malin", hint: "moins de 1 500 €" },
      { value: "comfort", label: "Confort", hint: "1 500 – 3 000 €" },
      { value: "premium", label: "Premium", hint: "3 000 – 6 000 €" },
      { value: "luxury", label: "Luxe", hint: "plus de 6 000 €" },
    ],
  },
  {
    id: "pace",
    type: "single",
    title: "Quel rythme préférez-vous ?",
    options: [
      {
        value: "slow",
        label: "Slow",
        hint: "Je me pose, je savoure, peu d'étapes",
      },
      {
        value: "balanced",
        label: "Équilibré",
        hint: "Mix exploration et détente",
      },
      {
        value: "fast",
        label: "Intensif",
        hint: "Je veux tout voir, beaucoup d'étapes",
      },
    ],
  },
  {
    id: "lodging",
    type: "multi",
    title: "Quel style d'hébergement ?",
    subtitle: "Plusieurs choix possibles",
    options: [
      { value: "boutique", label: "Hôtels de charme" },
      { value: "luxury", label: "Palaces, 5 étoiles" },
      { value: "villa", label: "Villas / maisons privées" },
      { value: "lodge", label: "Lodges, écolieux" },
      { value: "guesthouse", label: "Maisons d'hôtes typiques" },
      { value: "design", label: "Hôtels design" },
    ],
  },
  {
    id: "interests",
    type: "multi",
    title: "Qu'est-ce qui vous fait vibrer ?",
    subtitle: "Plusieurs choix possibles",
    options: [
      { value: "culture", label: "Culture, art, musées" },
      { value: "nature", label: "Nature, randonnée" },
      { value: "food", label: "Gastronomie, vins" },
      { value: "beach", label: "Plages, farniente" },
      { value: "adventure", label: "Sports, aventure" },
      { value: "wellness", label: "Spa, bien-être" },
      { value: "shopping", label: "Shopping, déco" },
      { value: "nightlife", label: "Vie nocturne" },
      { value: "wildlife", label: "Faune, safaris" },
      { value: "history", label: "Histoire, sites antiques" },
    ],
  },
  {
    id: "wishes",
    type: "longtext",
    title: "Une expérience incontournable ?",
    subtitle: "Quelque chose qu'il faut absolument inclure",
    placeholder: "Dîner dans un restaurant étoilé, nuit sous tente bédouine, plongée avec les requins-baleines…",
  },
  {
    id: "constraints",
    type: "longtext",
    title: "Choses à éviter, contraintes ?",
    subtitle: "Allergies, mobilité réduite, peurs, ce qui vous rebute",
    placeholder: "Pas de transport en commun bondé, pas de fruits de mer, vertige…",
  },
];

/**
 * Compose un prompt narratif à partir des réponses du brief, prêt à être
 * passé à l'IA de génération de roadbook.
 */
export function composePromptFromBrief(
  answers: Record<string, unknown>,
  clientName?: string | null,
): string {
  const parts: string[] = [];

  if (clientName) {
    parts.push(`Brief pour ${clientName}.`);
  }

  const get = (id: string) => answers[id];

  const dest = get("destination");
  if (typeof dest === "string" && dest.trim()) {
    parts.push(`Destination souhaitée : ${dest.trim()}.`);
  }

  const dates = get("dates");
  if (typeof dates === "string" && dates.trim()) {
    parts.push(`Période : ${dates.trim()}.`);
  }

  const duration = get("duration");
  if (typeof duration === "number" || (typeof duration === "string" && duration)) {
    parts.push(`Durée : ${duration} jour${Number(duration) > 1 ? "s" : ""}.`);
  }

  const travelers = get("travelers");
  const travelerLabel: Record<string, string> = {
    couple: "en couple",
    family: "en famille avec enfants",
    friends: "entre amis",
    solo: "en solo",
    group: "en groupe (>5 personnes)",
  };
  if (typeof travelers === "string" && travelerLabel[travelers]) {
    parts.push(`Voyage ${travelerLabel[travelers]}.`);
  }

  const budget = get("budget");
  const budgetLabel: Record<string, string> = {
    smart: "budget malin (<1500€/pers hors vols)",
    comfort: "budget confort (1500-3000€/pers hors vols)",
    premium: "budget premium (3000-6000€/pers hors vols)",
    luxury: "budget luxe (>6000€/pers hors vols)",
  };
  if (typeof budget === "string" && budgetLabel[budget]) {
    parts.push(`Niveau de gamme : ${budgetLabel[budget]}.`);
  }

  const pace = get("pace");
  const paceLabel: Record<string, string> = {
    slow: "slow travel (peu d'étapes, on prend le temps)",
    balanced: "équilibré (mix exploration / détente)",
    fast: "intensif (beaucoup d'étapes, on voit un maximum de choses)",
  };
  if (typeof pace === "string" && paceLabel[pace]) {
    parts.push(`Rythme : ${paceLabel[pace]}.`);
  }

  const lodging = get("lodging");
  if (Array.isArray(lodging) && lodging.length) {
    const lodgingLabel: Record<string, string> = {
      boutique: "hôtels de charme",
      luxury: "palaces 5*",
      villa: "villas privées",
      lodge: "lodges écoresponsables",
      guesthouse: "maisons d'hôtes typiques",
      design: "hôtels design",
    };
    const labels = lodging
      .map((v) => lodgingLabel[v as string])
      .filter(Boolean);
    if (labels.length) {
      parts.push(`Hébergement souhaité : ${labels.join(", ")}.`);
    }
  }

  const interests = get("interests");
  if (Array.isArray(interests) && interests.length) {
    const interestLabel: Record<string, string> = {
      culture: "culture / art / musées",
      nature: "nature / randonnée",
      food: "gastronomie / vins",
      beach: "plages / farniente",
      adventure: "sports / aventure",
      wellness: "spa / bien-être",
      shopping: "shopping / déco",
      nightlife: "vie nocturne",
      wildlife: "faune / safaris",
      history: "histoire / sites antiques",
    };
    const labels = interests
      .map((v) => interestLabel[v as string])
      .filter(Boolean);
    if (labels.length) {
      parts.push(`Centres d'intérêt : ${labels.join(", ")}.`);
    }
  }

  const wishes = get("wishes");
  if (typeof wishes === "string" && wishes.trim()) {
    parts.push(`Expérience incontournable demandée : ${wishes.trim()}.`);
  }

  const constraints = get("constraints");
  if (typeof constraints === "string" && constraints.trim()) {
    parts.push(`Contraintes / à éviter : ${constraints.trim()}.`);
  }

  parts.push(
    "Construis un roadbook éditorial cohérent, en équilibrant les centres d'intérêt et en respectant les contraintes ci-dessus.",
  );

  return parts.join(" ");
}
