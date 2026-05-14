// ============================================================================
// PDF Color Palettes — choix éditorial avant export
// ============================================================================
//
// Chaque palette est une combinaison cohérente curated par un designer.
// Le travel designer choisit avant l'export selon la destination/ambiance.
//
// Conventions :
//   - primary       : couleur principale (cover, jour-num, accents)
//   - primaryLight  : variant clair pour ombres / gradients (rarement utilisé)
//   - primarySoft   : background subtle pour bandeaux récap, citations
//   - ink           : couleur principale du texte
//   - muted         : couleur du texte secondaire
//   - paper         : couleur du fond blanc (généralement #FFFFFF, parfois warm)
//   - stripe        : couleur de séparateurs / zones alternées
//
// Toutes les palettes ont été testées pour :
//   - Contraste WCAG AA sur texte (ink/muted sur paper)
//   - Contraste cover (paper sur primary)
//   - Cohérence visuelle des accents (primarySoft assez clair pour être lisible)
// ============================================================================

export interface PdfPalette {
  /** Identifier stable utilisé en URL/DB. NE JAMAIS RENOMMER. */
  id: PdfPaletteId;
  /** Nom affiché à l'utilisateur. */
  name: string;
  /** Sous-titre éditorial pour aider à choisir. */
  tagline: string;
  primary: string;
  primaryLight: string;
  primarySoft: string;
  ink: string;
  muted: string;
  paper: string;
  stripe: string;
}

export type PdfPaletteId =
  | "emerald"
  | "ochre"
  | "midnight"
  | "burgundy"
  | "sand"
  | "cobalt";

export const EMERALD: PdfPalette = {
  id: "emerald",
  name: "Émeraude",
  tagline: "Polyvalente — voyages nature, safaris, escapades europe",
  primary: "#0F6E56",
  primaryLight: "#1D9E75",
  primarySoft: "#E1F5EE",
  ink: "#1A1A1A",
  muted: "#6B7075",
  paper: "#FFFFFF",
  stripe: "#F5F5F0",
};

export const OCHRE: PdfPalette = {
  id: "ochre",
  name: "Ocre",
  tagline: "Terres chaudes — Maroc, Tanzanie, Toscane, Sud-Ouest US",
  primary: "#A4571E",
  primaryLight: "#C97A38",
  primarySoft: "#F5E6D4",
  ink: "#1F1611",
  muted: "#6F5C49",
  paper: "#FBF7F1",
  stripe: "#F0E8D9",
};

export const MIDNIGHT: PdfPalette = {
  id: "midnight",
  name: "Minuit",
  tagline: "Sophistiqué urbain — New York, Tokyo, Londres, Hong Kong",
  primary: "#1B1F3A",
  primaryLight: "#2D3260",
  primarySoft: "#E4E6F0",
  ink: "#0F1020",
  muted: "#5B5F7A",
  paper: "#FFFFFF",
  stripe: "#F1F2F7",
};

export const BURGUNDY: PdfPalette = {
  id: "burgundy",
  name: "Bordeaux",
  tagline: "Culturel & gastronomique — Italie, France, Espagne, Argentine",
  primary: "#7B2C2C",
  primaryLight: "#A03D3D",
  primarySoft: "#F2E0E0",
  ink: "#1F0D0D",
  muted: "#6E5454",
  paper: "#FBF7F4",
  stripe: "#F1E8E4",
};

export const SAND: PdfPalette = {
  id: "sand",
  name: "Sable",
  tagline: "Désert & minimal — Sahara, Namibie, Wadi Rum, Atacama",
  primary: "#8E7B5F",
  primaryLight: "#A8957A",
  primarySoft: "#EFE9DA",
  ink: "#1F1A12",
  muted: "#6F6750",
  paper: "#FAF6EE",
  stripe: "#EFE9DA",
};

export const COBALT: PdfPalette = {
  id: "cobalt",
  name: "Cobalt",
  tagline: "Méditerranée & côte — Grèce, Croatie, Côte d'Azur, Amalfi",
  primary: "#2C4A8F",
  primaryLight: "#3D62B5",
  primarySoft: "#E0E7F5",
  ink: "#0F1530",
  muted: "#5C6B8A",
  paper: "#FFFFFF",
  stripe: "#F0F3FA",
};

export const PDF_PALETTES: PdfPalette[] = [
  EMERALD,
  OCHRE,
  MIDNIGHT,
  BURGUNDY,
  SAND,
  COBALT,
];

export const PDF_PALETTES_BY_ID: Record<PdfPaletteId, PdfPalette> = {
  emerald: EMERALD,
  ochre: OCHRE,
  midnight: MIDNIGHT,
  burgundy: BURGUNDY,
  sand: SAND,
  cobalt: COBALT,
};

/** Palette par défaut quand rien n'est précisé — préserve le rendu historique. */
export const DEFAULT_PALETTE: PdfPalette = EMERALD;

/** Helper safe pour récupérer une palette depuis un id stocké en DB ou query. */
export function getPalette(id: string | null | undefined): PdfPalette {
  if (!id) return DEFAULT_PALETTE;
  return PDF_PALETTES_BY_ID[id as PdfPaletteId] ?? DEFAULT_PALETTE;
}

// ============================================================================
// Auto-suggestion : palette suggérée selon la destination
// ============================================================================
//
// Heuristique simple basée sur des mots-clés présents dans le nom de la
// destination. Volontairement lâche (ne couvre pas tout) — fallback EMERALD
// si aucun match. Retourne null si pas de suggestion forte.
//
// Pattern : on évite les faux positifs. Mieux vaut PAS suggérer que mal
// suggérer.
// ============================================================================

const DESTINATION_PALETTE_MAP: Array<{
  paletteId: PdfPaletteId;
  /** Patterns regex case-insensitive testés contre la destination. */
  patterns: RegExp[];
}> = [
  {
    paletteId: "ochre",
    patterns: [
      /\bmaroc(c|c)?ai?n?e?\b/i,
      /\bmarrakech\b/i,
      /\bsahara\b/i, // Conflict avec sand — testé après dans l'ordre du tableau
      /\btanzani[ea]\b/i,
      /\bkeny[ae]\b/i,
      /\bnamibi[ea]\b/i,
      /\btoscan[ea]\b/i,
      /\bfloren[cz]e?\b/i,
      /\barizona\b/i,
      /\butah\b/i,
    ],
  },
  {
    paletteId: "midnight",
    patterns: [
      /\bnew[- ]?york\b/i,
      /\bny[ ]city\b/i,
      /\btokyo\b/i,
      /\blondre[s]?\b/i,
      /\blondon\b/i,
      /\bhong[- ]?kong\b/i,
      /\bsingap(o|ou)r[e]?\b/i,
      /\bduba[iï]\b/i,
      /\bberlin\b/i,
      /\bseoul\b/i,
    ],
  },
  {
    paletteId: "burgundy",
    patterns: [
      /\bitali[ea]\b/i,
      /\btus?can(y|ie|e)\b/i,
      /\bbourgogne\b/i,
      /\bbordeaux\b/i,
      /\bproven[cç]e\b/i,
      /\bargentin[ea]\b/i,
      /\bespagn[ea]\b/i,
      /\bandalou[s]?ie\b/i,
      /\bro[ÿy][ -]?aume[ -]?uni\b/i, // moins, garder pour culture
    ],
  },
  {
    paletteId: "sand",
    patterns: [
      /\bjorda?n[ie]?\b/i,
      /\bwadi\s*rum\b/i,
      /\batacam[ae]\b/i,
      /\bchili\b/i,
      /\bperou\b/i,
      /\bp[eé]rou\b/i,
      /\bbolivi[ea]\b/i,
      /\bs[ée]n[ée]gal\b/i,
      /\bmali\b/i,
      /\bsahara\b/i, // Si pas matché en ochre via Maroc/Tanzanie
    ],
  },
  {
    paletteId: "cobalt",
    patterns: [
      /\bgr[èe]ce\b/i,
      /\bsantorin[ie]?\b/i,
      /\bcrète?\b/i,
      /\bcroati[ea]\b/i,
      /\bc[ôo]te[ -]?d[' ]?azur\b/i,
      /\bamalfi\b/i,
      /\bcapri\b/i,
      /\bporquerolle?s?\b/i,
      /\bcorse\b/i,
      /\bsicile\b/i,
      /\bibiza\b/i,
      /\bmykonos\b/i,
    ],
  },
  {
    paletteId: "emerald",
    patterns: [
      /\bislande\b/i,
      /\bnorv[èe]ge\b/i,
      /\bsu[èe]de\b/i,
      /\bcanada\b/i,
      /\balaska\b/i,
      /\bcosta[ -]?rica\b/i,
      /\b[ée]quateur\b/i,
      /\bp[ée]rou\b/i, // remapped si pas matché ailleurs
      /\bsafari\b/i,
      /\bafriqu[ea]\b/i,
    ],
  },
];

/**
 * Suggère une palette adaptée à la destination du roadbook.
 *
 * Retourne null si aucune correspondance — le caller utilise alors :
 * 1. La dernière palette stockée en localStorage (UX persistance)
 * 2. La palette par défaut (EMERALD) si rien en localStorage
 *
 * @example
 *   suggestPaletteForDestination("Maroc, Marrakech") → "ochre"
 *   suggestPaletteForDestination("Tokyo Japon")       → "midnight"
 *   suggestPaletteForDestination("Lyon week-end")     → null
 */
export function suggestPaletteForDestination(
  destination: string | null | undefined,
): PdfPaletteId | null {
  if (!destination) return null;
  const text = destination.trim();
  if (!text) return null;

  for (const entry of DESTINATION_PALETTE_MAP) {
    if (entry.patterns.some((re) => re.test(text))) {
      return entry.paletteId;
    }
  }
  return null;
}
