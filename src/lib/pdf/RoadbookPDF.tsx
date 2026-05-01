import {
  Document,
  Page,
  View,
  Text,
  Image,
  StyleSheet,
  Font,
} from "@react-pdf/renderer";
import React from "react";

// ---------- Fonts ----------
// Use WOFF files: Fontsource v5 exposes .woff/.woff2 on CDN, not .ttf.
// react-pdf supports .woff, while .woff2 is not reliable here.
export let FONTS_LOADED = false;
try {
  Font.register({
    family: "Inter",
    fonts: [
      {
        src: "https://cdn.jsdelivr.net/npm/@fontsource/inter/files/inter-latin-400-normal.woff",
        fontWeight: 400,
      },
      {
        src: "https://cdn.jsdelivr.net/npm/@fontsource/inter/files/inter-latin-500-normal.woff",
        fontWeight: 500,
      },
      {
        src: "https://cdn.jsdelivr.net/npm/@fontsource/inter/files/inter-latin-600-normal.woff",
        fontWeight: 600,
      },
      {
        src: "https://cdn.jsdelivr.net/npm/@fontsource/inter/files/inter-latin-700-normal.woff",
        fontWeight: 700,
      },
      {
        src: "https://cdn.jsdelivr.net/npm/@fontsource/inter/files/inter-latin-400-italic.woff",
        fontWeight: 400,
        fontStyle: "italic",
      },
    ],
  });

  Font.register({
    family: "Playfair",
    fonts: [
      {
        src: "https://cdn.jsdelivr.net/npm/@fontsource/playfair-display/files/playfair-display-latin-400-normal.woff",
        fontWeight: 400,
      },
      {
        src: "https://cdn.jsdelivr.net/npm/@fontsource/playfair-display/files/playfair-display-latin-600-normal.woff",
        fontWeight: 600,
      },
      {
        src: "https://cdn.jsdelivr.net/npm/@fontsource/playfair-display/files/playfair-display-latin-700-normal.woff",
        fontWeight: 700,
      },
      {
        src: "https://cdn.jsdelivr.net/npm/@fontsource/playfair-display/files/playfair-display-latin-400-italic.woff",
        fontWeight: 400,
        fontStyle: "italic",
      },
    ],
  });

  FONTS_LOADED = true;
} catch (err) {
  console.warn("[RoadbookPDF] Font.register failed, falling back to Helvetica:", err);
  FONTS_LOADED = false;
}

// Avoid hyphenation on words for cleaner editorial layout.
try {
  Font.registerHyphenationCallback((word) => [word]);
} catch {}

// ---------- Types ----------
export interface RoadbookContent {
  client_name?: string;
  destination?: string;
  start_date?: string;
  end_date?: string;
  duration_days?: number;
  travelers?: number;
  profile?: string;
  theme?: string;
  budget_range?: string;
  travel_mode?: string;
  cover?: {
    title?: string;
    subtitle?: string;
    tagline?: string;
    dates_label?: string;
  };
  overview?: string;
  days?: Array<{
    day: number;
    date?: string;
    stage?: string;
    accommodation?: string;
    type?: string;
    distance_km?: number;
    drive_hours?: number;
    flight?: string;
    narrative?: string;
    lat?: number;
    lng?: number;
    photos?: Array<{
      url: string;
      source?: string;
      credit?: string;
      alt?: string;
    }>;
  }>;
  accommodations_summary?: Array<{
    name: string;
    location: string;
    nights: number;
    type: string;
  }>;
  contacts?: Array<{
    role: string;
    name: string;
    phone: string;
    email?: string;
  }>;
  tips?: string[];
  /** Tracés routiers cachés (calculés côté Directions API) — utilisés pour la carte PDF. */
  directions_segments?: Array<{
    from_day: number;
    to_day: number;
    encoded_polyline: string | null;
    distance_meters: number | null;
    duration_seconds: number | null;
    mode?: string;
  }>;
}

// ---------- Colors ----------
const TEAL = "#0F6E56";
const TEAL_LIGHT = "#1D9E75";
const TEAL_SOFT = "#E1F5EE";
const INK = "#1A1A1A";
const MUTED = "#6B7075";
const PAPER = "#FFFFFF";
const STRIPE = "#F5F5F0";

// ---------- Styles ----------
const styles = StyleSheet.create({
  // Cover
  coverPage: {
    backgroundColor: TEAL,
    color: PAPER,
    padding: 0,
    fontFamily: "Inter",
  },
  coverWrap: {
    flex: 1,
    paddingHorizontal: 56,
    paddingVertical: 80,
    justifyContent: "center",
    alignItems: "center",
    textAlign: "center",
  },
  eyebrow: {
    fontSize: 10,
    fontWeight: 500,
    letterSpacing: 4,
    color: PAPER,
    opacity: 0.7,
    textTransform: "uppercase",
    marginBottom: 36,
  },
  coverTitle: {
    fontFamily: "Playfair",
    fontWeight: 700,
    fontSize: 78,
    lineHeight: 1,
    color: PAPER,
    marginBottom: 14,
    textAlign: "center",
  },
  coverSubtitle: {
    fontFamily: "Playfair",
    fontStyle: "italic",
    fontWeight: 400,
    fontSize: 22,
    color: PAPER,
    opacity: 0.95,
    marginBottom: 12,
    textAlign: "center",
  },
  coverTagline: {
    fontFamily: "Inter",
    fontStyle: "italic",
    fontSize: 13,
    color: PAPER,
    opacity: 0.85,
    marginBottom: 36,
    textAlign: "center",
    paddingHorizontal: 60,
    lineHeight: 1.5,
  },
  pillRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
    justifyContent: "center",
  },
  pill: {
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 7,
    color: PAPER,
    fontSize: 11,
    fontWeight: 500,
  },
  pillSmallCaps: {
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 7,
    color: PAPER,
    fontSize: 9,
    fontWeight: 600,
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  coverFooter: {
    position: "absolute",
    bottom: 36,
    left: 0,
    right: 0,
    textAlign: "center",
    color: PAPER,
    opacity: 0.6,
    fontSize: 9,
    letterSpacing: 2,
    textTransform: "uppercase",
  },

  // Standard page
  page: {
    paddingTop: 48,
    paddingBottom: 56,
    paddingHorizontal: 48,
    fontFamily: "Inter",
    fontSize: 11,
    color: INK,
    lineHeight: 1.55,
    backgroundColor: PAPER,
  },
  pageHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    paddingBottom: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: "#E5E5E5",
    marginBottom: 24,
  },
  brandMini: {
    fontSize: 9,
    fontWeight: 600,
    letterSpacing: 2,
    color: TEAL,
    textTransform: "uppercase",
  },
  pageMeta: {
    fontSize: 8,
    letterSpacing: 1.5,
    color: MUTED,
    textTransform: "uppercase",
  },
  h1: {
    fontFamily: "Playfair",
    fontWeight: 700,
    fontSize: 28,
    color: INK,
    marginBottom: 4,
  },
  rule: {
    width: 40,
    height: 2,
    backgroundColor: TEAL,
    marginBottom: 18,
  },
  sectionEyebrow: {
    fontSize: 9,
    fontWeight: 600,
    letterSpacing: 2.5,
    color: TEAL,
    textTransform: "uppercase",
    marginBottom: 10,
  },
  body: {
    fontSize: 11.5,
    lineHeight: 1.7,
    color: INK,
    marginBottom: 18,
    fontFamily: "Inter",
  },

  // Stats grid
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 8,
  },
  statCard: {
    backgroundColor: TEAL_SOFT,
    borderRadius: 6,
    paddingVertical: 12,
    paddingHorizontal: 14,
    width: "48.5%",
  },
  statLabel: {
    fontSize: 8,
    letterSpacing: 1.5,
    color: TEAL,
    textTransform: "uppercase",
    fontWeight: 600,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 13,
    fontWeight: 600,
    color: INK,
  },

  // Day card
  day: {
    marginBottom: 22,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: TEAL,
  },
  dayHead: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 14,
    marginBottom: 6,
  },
  dayNum: {
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: 2,
    color: TEAL,
    textTransform: "uppercase",
  },
  dayDate: {
    fontSize: 10,
    color: MUTED,
  },
  dayStage: {
    fontFamily: "Playfair",
    fontWeight: 600,
    fontSize: 18,
    color: INK,
    marginBottom: 6,
  },
  dayLine: {
    fontSize: 10.5,
    color: INK,
    marginBottom: 3,
  },
  dayMeta: {
    fontSize: 9.5,
    color: MUTED,
    marginBottom: 8,
  },
  dayNarrative: {
    fontFamily: "Inter",
    fontStyle: "italic",
    fontSize: 11,
    lineHeight: 1.65,
    color: INK,
    marginTop: 6,
  },
  dayPhotosRow: {
    flexDirection: "row",
    gap: 6,
    marginTop: 10,
  },
  dayPhoto: {
    flex: 1,
    height: 110,
    objectFit: "cover",
    borderRadius: 3,
  },
  dayPhotoCredit: {
    fontSize: 7.5,
    color: MUTED,
    marginTop: 4,
    fontStyle: "italic",
  },

  // Table
  table: {
    width: "100%",
    marginTop: 6,
  },
  tableHead: {
    flexDirection: "row",
    backgroundColor: TEAL,
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  tableHeadCell: {
    color: PAPER,
    fontSize: 8,
    fontWeight: 600,
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: "#EAEAEA",
  },
  tableRowAlt: {
    backgroundColor: STRIPE,
  },
  tableCell: {
    fontSize: 10,
    color: INK,
  },

  // Contacts
  contactBlock: {
    marginBottom: 16,
    paddingBottom: 14,
    borderBottomWidth: 0.5,
    borderBottomColor: "#EAEAEA",
  },
  contactRole: {
    fontSize: 8,
    color: MUTED,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    marginBottom: 4,
    fontWeight: 600,
  },
  contactName: {
    fontSize: 13,
    fontWeight: 600,
    color: INK,
    marginBottom: 2,
  },
  contactLine: {
    fontSize: 10.5,
    color: INK,
  },

  // Tips
  tipRow: {
    flexDirection: "row",
    marginBottom: 10,
  },
  tipBullet: {
    width: 14,
    fontSize: 14,
    color: TEAL,
    lineHeight: 1.4,
  },
  tipText: {
    flex: 1,
    fontSize: 11,
    lineHeight: 1.65,
    color: INK,
  },

  // Map
  mapFrame: {
    marginTop: 14,
    padding: 10,
    backgroundColor: "#f5f0e3",
    borderRadius: 4,
    border: "1 solid #ebe5d2",
  },
  mapImg: {
    width: "100%",
    height: 380,
    objectFit: "cover",
    borderRadius: 2,
  },
  mapCaption: {
    marginTop: 14,
    fontSize: 9,
    color: MUTED,
    fontStyle: "italic",
    textAlign: "center",
    letterSpacing: 0.3,
  },
  mapStatsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 22,
    paddingTop: 18,
    borderTop: "1 solid #ebe5d2",
  },
  mapStatCell: {
    flex: 1,
    alignItems: "center",
  },
  mapStatLabel: {
    fontSize: 8,
    fontWeight: 600,
    color: MUTED,
    textTransform: "uppercase",
    letterSpacing: 1.4,
    marginBottom: 4,
  },
  mapStatValue: {
    fontFamily: "Playfair",
    fontWeight: 600,
    fontSize: 22,
    color: INK,
  },
  mapStatUnit: {
    fontSize: 9,
    color: MUTED,
    marginLeft: 2,
  },
  mapLegendRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 0,
    marginTop: 16,
  },
  mapLegendItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 4,
    paddingRight: 14,
    width: "33%",
  },
  mapLegendNum: {
    fontSize: 8,
    fontWeight: 700,
    color: "#fff",
    backgroundColor: TEAL,
    borderRadius: 99,
    width: 14,
    height: 14,
    textAlign: "center",
    paddingTop: 2,
    marginRight: 6,
  },
  mapLegendText: {
    fontSize: 9,
    color: INK,
    flex: 1,
  },

  // End page
  endPage: {
    backgroundColor: PAPER,
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 60,
    fontFamily: "Inter",
  },
  endTitle: {
    fontFamily: "Playfair",
    fontStyle: "italic",
    fontWeight: 600,
    fontSize: 32,
    color: TEAL,
    textAlign: "center",
    marginBottom: 20,
  },
  endText: {
    fontSize: 11,
    color: MUTED,
    textAlign: "center",
    marginBottom: 6,
  },
  endBrand: {
    marginTop: 30,
    fontSize: 10,
    fontWeight: 600,
    letterSpacing: 3,
    color: TEAL,
    textTransform: "uppercase",
  },

  // Footer page number
  pageNumber: {
    position: "absolute",
    bottom: 24,
    left: 48,
    right: 48,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 8,
    color: MUTED,
    letterSpacing: 1,
  },
});

// ---------- Helpers ----------
function formatDateFR(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/**
 * Construit l'URL Mapbox Static Images pour la carte du PDF.
 *
 * Mapbox >> Google Static Maps pour le rendu éditorial : styles propres,
 * marqueurs numérotés 1-99 supportés, auto-fit aux overlays, et gestion
 * native des polylines encodées (compatibles Google polyline format).
 *
 * Style par défaut : `outdoors-v12` (terrain, idéal pour voyage / safari).
 * Pour customiser, créer un style dans Mapbox Studio et passer son ID via
 * `mapbox/{style-id}` ou `{username}/{style-id}`.
 */
function buildMapboxStaticUrl(
  days: NonNullable<RoadbookContent["days"]>,
  segments: Array<{
    encoded_polyline?: string | null;
    mode?: string;
  }> | undefined,
  accessToken: string,
  styleId: string = "mapbox/outdoors-v12",
): string | null {
  if (!accessToken) return null;
  const points = days
    .filter((d) => typeof d.lat === "number" && typeof d.lng === "number")
    .map((d) => ({ day: d.day, lat: d.lat as number, lng: d.lng as number }));
  if (points.length === 0) return null;

  // Mapbox overlays — l'ORDRE compte (premier = dessous, dernier = dessus) :
  //   1. Squelette (ligne fine semi-transparente reliant TOUS les points)
  //      → garantit qu'aucun jour ne reste "orphelin" visuellement
  //   2. Polylines réelles (épaisses, opaques) par-dessus le squelette
  //      → là où on a une vraie route, elle écrase la ligne droite
  //   3. Marqueurs (au-dessus de tout, pour qu'ils restent lisibles)
  //
  // Format Mapbox :
  //   path-{width}+{color}-{opacity}({encoded_polyline})
  //   pin-l-{label}+{color}({lon},{lat})
  const overlays: string[] = [];

  // ---- 1. Squelette : ligne fine reliant tous les points dans l'ordre ----
  // Toujours présent. Garantit qu'on voit la silhouette du voyage entier.
  if (points.length >= 2) {
    const skeletonPolyline = encodePolyline(
      points.map((p) => [p.lat, p.lng]),
    );
    overlays.push(
      `path-2+0F6E56-0.55(${encodeURIComponent(skeletonPolyline)})`,
    );
  }

  // ---- 2. Polylines réelles ----
  // Budget URL : on garde de la marge pour les markers (estim. 1500 chars).
  let urlLen = 250 + overlays[0]?.length || 0;
  const MARKER_BUDGET = points.length * 45;
  const PATH_BUDGET_MAX = 7500 - MARKER_BUDGET;

  if (segments && segments.length > 0) {
    for (const seg of segments) {
      if (!seg.encoded_polyline) continue;
      const encoded = encodeURIComponent(seg.encoded_polyline);
      const overlay = `path-5+0F6E56-1.0(${encoded})`;
      if (urlLen + overlay.length + 1 > PATH_BUDGET_MAX) break;
      overlays.push(overlay);
      urlLen += overlay.length + 1;
    }
  }

  // ---- 3. Marqueurs — Mapbox supporte labels 1-99 nativement ----
  // Note : si plusieurs jours ont les mêmes lat/lng (ex: 3 nuits au même
  // lodge), ils s'empilent. Pour les rendre tous visibles, on déduplique
  // en gardant le LAST jour à chaque coord (numéro le plus haut visible).
  const seenCoords = new Map<string, number>();
  for (const p of points) {
    const key = `${p.lat.toFixed(4)},${p.lng.toFixed(4)}`;
    const existing = seenCoords.get(key);
    if (!existing || p.day > existing) {
      seenCoords.set(key, p.day);
    }
  }
  // Recrée la liste de markers sans doublons coord, mais en gardant la
  // première occurrence par jour (donc on ne perd pas la séquence).
  const markersAdded = new Set<string>();
  for (const p of points) {
    const key = `${p.lat.toFixed(4)},${p.lng.toFixed(4)}`;
    if (markersAdded.has(key)) continue;
    markersAdded.add(key);
    // On affiche le label du dernier jour à cette position (souvent le plus
    // haut numéro = mieux pour comprendre "jusqu'à quel jour on reste ici")
    const label = seenCoords.get(key) ?? p.day;
    overlays.push(`pin-l-${label}+0F6E56(${p.lng},${p.lat})`);
  }

  const overlayStr = overlays.join(",");

  // /auto/{w}x{h}@2x → Mapbox calcule center+zoom optimaux pour englober
  // tous les overlays avec un padding raisonnable. Massive amélioration vs
  // Google où il faut tout calculer soi-même.
  const url =
    `https://api.mapbox.com/styles/v1/${styleId}/static/` +
    `${overlayStr}/auto/1280x840@2x` +
    `?access_token=${encodeURIComponent(accessToken)}` +
    `&logo=false&attribution=false`;

  return url;
}

/**
 * Encode un tableau de points [lat, lng] en polyline format Google/Mapbox.
 * Implémentation minimale du Polyline Encoded Algorithm.
 * Réf : https://developers.google.com/maps/documentation/utilities/polylinealgorithm
 */
function encodePolyline(coords: Array<[number, number]>): string {
  let result = "";
  let prevLat = 0;
  let prevLng = 0;
  for (const [lat, lng] of coords) {
    const e5Lat = Math.round(lat * 1e5);
    const e5Lng = Math.round(lng * 1e5);
    result += encodeNumber(e5Lat - prevLat);
    result += encodeNumber(e5Lng - prevLng);
    prevLat = e5Lat;
    prevLng = e5Lng;
  }
  return result;
}

function encodeNumber(num: number): string {
  let n = num < 0 ? ~(num << 1) : num << 1;
  let result = "";
  while (n >= 0x20) {
    result += String.fromCharCode((0x20 | (n & 0x1f)) + 63);
    n >>= 5;
  }
  result += String.fromCharCode(n + 63);
  return result;
}

/**
 * Construit l'URL Google Static Maps pour la carte du PDF.
 *
 * GARDE COMME FALLBACK si VITE_MAPBOX_TOKEN n'est pas configuré.
 *
 * IMPORTANT — pourquoi on construit l'URL "à la main" et pas via
 * URLSearchParams : Google Static Maps utilise des `|` non encodés comme
 * séparateurs internes (style=feature:water|color:0xXXX). URLSearchParams
 * encode ces `|` en `%7C`, ce qui casse silencieusement les rules
 * complexes — Google ignore les paramètres mal formés sans erreur.
 * Conséquence : style appliqué partiellement, path invisible, etc.
 *
 * Ici on encode UNIQUEMENT ce qui doit l'être (clé, valeurs avec espaces),
 * et on garde les `|` bruts.
 */
function buildStaticMapUrl(
  days: NonNullable<RoadbookContent["days"]>,
  segments: Array<{
    encoded_polyline?: string | null;
    mode?: string;
  }> | undefined,
  apiKey?: string,
): string | null {
  if (!apiKey) return null;
  const points = days
    .filter((d) => typeof d.lat === "number" && typeof d.lng === "number")
    .map((d) => ({ day: d.day, lat: d.lat as number, lng: d.lng as number }));
  if (points.length === 0) return null;

  const base = "https://maps.googleapis.com/maps/api/staticmap";
  const parts: string[] = [];

  parts.push("size=640x420");
  parts.push("scale=2");
  parts.push("maptype=roadmap");
  parts.push("language=fr");

  // Style éditorial minimal qui MARCHE — moins de rules = plus fiable.
  // Chaque rule est conçue selon le format strict de Static Maps :
  //   style=feature:X|element:Y|rule:value
  // On garde les `|` bruts (ne pas encoder).
  const styleRules = [
    // Hide tout le bruit
    "feature:poi|visibility:off",
    "feature:transit|visibility:off",
    "feature:road|element:labels|visibility:off",
    // Land : sable chaud (matche la palette du PDF)
    "feature:landscape|element:geometry.fill|color:0xf5f0e3",
    "feature:landscape.natural|element:geometry.fill|color:0xede5d2",
    // Eau : teal désaturé, matche la cover teal du roadbook
    "feature:water|element:geometry.fill|color:0xb8d4cc",
    // Routes : barement visibles, juste pour donner du contexte
    "feature:road|element:geometry.fill|color:0xe8e0cf",
    "feature:road.highway|element:geometry.fill|color:0xd4c5a8",
    // Frontières pays : trait ambré fin
    "feature:administrative.country|element:geometry.stroke|color:0xc99263|weight:1.5",
    // Labels : couleur encre, pas de halo bruyant
    "feature:all|element:labels.text.fill|color:0x4a4a3f",
    "feature:all|element:labels.icon|visibility:off",
  ];
  for (const rule of styleRules) {
    parts.push(`style=${rule}`);
  }

  // Marqueurs — branded teal, J1-J9 numérotés, J10+ en petit point ambre.
  for (const p of points) {
    if (p.day <= 9) {
      parts.push(
        `markers=color:0x0F6E56|label:${p.day}|size:mid|${p.lat},${p.lng}`,
      );
    } else {
      parts.push(`markers=color:0xC99263|size:tiny|${p.lat},${p.lng}`);
    }
  }

  // Tracé RÉEL via polylines cachées (Directions API). Si pas dispo →
  // fallback ligne géodésique entre les points (= courbe naturelle).
  let usedRealPath = false;
  let urlLen = base.length + parts.join("&").length + 100;

  if (segments && segments.length > 0) {
    for (const seg of segments) {
      if (!seg.encoded_polyline) continue;
      // L'`enc:` polyline contient des chars qui DOIVENT être URL-encodés
      // (sinon ?: \: etc. cassent l'URL). Mais le séparateur initial `|`
      // doit rester brut. On encode uniquement la valeur enc.
      const encoded = encodeURIComponent(seg.encoded_polyline);
      const pathParam = `path=color:0x0F6E56FF|weight:5|enc:${encoded}`;
      if (urlLen + pathParam.length + 1 > 14_000) break;
      parts.push(pathParam);
      urlLen += pathParam.length + 1;
      usedRealPath = true;
    }
  }

  // Fallback : si pas de polylines (ou pas assez), on dessine une ligne
  // géodésique entre TOUS les points. Toujours visible, contraste fort.
  if (!usedRealPath && points.length >= 2) {
    const pathPts = points.map((p) => `${p.lat},${p.lng}`).join("|");
    parts.push(`path=color:0x0F6E56FF|weight:4|geodesic:true|${pathPts}`);
  }

  parts.push(`key=${encodeURIComponent(apiKey)}`);

  const url = `${base}?${parts.join("&")}`;

  // Garde-fou : si trop long, on retombe sur une carte minimale (sans
  // styling, sans polylines) — c'est moche mais ça s'affichera.
  if (url.length > 16_000) {
    console.warn(
      `[buildStaticMapUrl] URL ${url.length} chars > 16 KB, fallback minimal`,
    );
    const fallbackParts = [
      "size=640x420",
      "scale=2",
      "maptype=roadmap",
      "language=fr",
    ];
    for (const p of points) {
      fallbackParts.push(
        `markers=color:0x0F6E56|${p.day <= 9 ? `label:${p.day}|` : ""}${p.lat},${p.lng}`,
      );
    }
    if (points.length >= 2) {
      const pathPts = points.map((p) => `${p.lat},${p.lng}`).join("|");
      fallbackParts.push(
        `path=color:0x0F6E56FF|weight:4|geodesic:true|${pathPts}`,
      );
    }
    fallbackParts.push(`key=${encodeURIComponent(apiKey)}`);
    return `${base}?${fallbackParts.join("&")}`;
  }

  return url;
}

// Chunk days into pages of N for itinerary section.
function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

// ---------- Component ----------
export function RoadbookPDF({
  roadbook,
  mapsApiKey,
  coverImageUrl,
  watermark = false,
}: {
  roadbook: RoadbookContent;
  mapsApiKey?: string;
  coverImageUrl?: string | null;
  /** Si true, ajoute un nudge "via Roadbook.ai" prononcé sur cover + footer. */
  watermark?: boolean;
}) {
  const cover = roadbook.cover || {};
  const days = roadbook.days || [];
  const accommodations = roadbook.accommodations_summary || [];
  const contacts = roadbook.contacts || [];
  const tips = roadbook.tips || [];
  const destination = roadbook.destination || cover.title || "Voyage";
  // Préfère Mapbox (rendu éditorial premium) ; fallback Google si pas de token.
  // Le token est exposé client-side via VITE_MAPBOX_TOKEN — sécurisé par
  // les URL restrictions configurées sur le dashboard Mapbox.
  // Style perso optionnel via VITE_MAPBOX_STYLE (format "username/style_id"),
  // sinon on utilise outdoors-v12 par défaut.
  const env =
    typeof import.meta !== "undefined"
      ? (import.meta as any).env
      : undefined;
  const mapboxToken = env?.VITE_MAPBOX_TOKEN as string | undefined;
  const mapboxStyle = (env?.VITE_MAPBOX_STYLE as string | undefined) || "mapbox/outdoors-v12";
  const mapUrl = mapboxToken
    ? buildMapboxStaticUrl(
        days,
        roadbook.directions_segments,
        mapboxToken,
        mapboxStyle,
      )
    : buildStaticMapUrl(days, roadbook.directions_segments, mapsApiKey);
  const dayPages = chunk(days, 3);

  const pageMeta = `${roadbook.client_name || ""}${
    roadbook.client_name && destination ? " · " : ""
  }${destination}`;

  const generatedOn = new Date().toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <Document
      title={`Roadbook — ${roadbook.client_name || ""} — ${destination}`}
      author="Roadbook.ai"
    >
      {/* ---------- Cover ---------- */}
      <Page size="A4" style={styles.coverPage}>
        {coverImageUrl ? (
          <Image
            src={coverImageUrl}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
          />
        ) : null}
        {/* Teal overlay for legibility */}
        <View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: coverImageUrl
              ? "rgba(15,110,86,0.78)"
              : TEAL,
          }}
        />
        <View style={styles.coverWrap}>
          <Text style={styles.eyebrow}>Roadbook</Text>
          <Text style={styles.coverTitle}>{cover.title || destination}</Text>
          {cover.subtitle ? (
            <Text style={styles.coverSubtitle}>{cover.subtitle}</Text>
          ) : null}
          {cover.tagline ? (
            <Text style={styles.coverTagline}>{cover.tagline}</Text>
          ) : null}
          <View style={styles.pillRow}>
            {cover.dates_label ? (
              <Text style={styles.pill}>{cover.dates_label}</Text>
            ) : null}
            {roadbook.travel_mode ? (
              <Text style={styles.pillSmallCaps}>{roadbook.travel_mode}</Text>
            ) : null}
          </View>
        </View>
        <Text style={styles.coverFooter}>
          {watermark
            ? "Composé avec Roadbook.ai — créez le vôtre sur roadbook.ai"
            : "Préparé avec Roadbook.ai"}
        </Text>
      </Page>

      {/* ---------- Overview + Stats ---------- */}
      <Page size="A4" style={styles.page}>
        <View style={styles.pageHeader}>
          <Text style={styles.brandMini}>Roadbook.ai</Text>
          <Text style={styles.pageMeta}>{pageMeta}</Text>
        </View>

        <Text style={styles.h1}>{destination}</Text>
        <View style={styles.rule} />

        {roadbook.overview ? (
          <>
            <Text style={styles.sectionEyebrow}>Vue d'ensemble</Text>
            <Text style={styles.body}>{roadbook.overview}</Text>
          </>
        ) : null}

        <Text style={styles.sectionEyebrow}>En bref</Text>
        <View style={styles.statsGrid}>
          {roadbook.duration_days ? (
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Durée</Text>
              <Text style={styles.statValue}>
                {roadbook.duration_days} jours
              </Text>
            </View>
          ) : null}
          {roadbook.travelers ? (
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Voyageurs</Text>
              <Text style={styles.statValue}>
                {roadbook.travelers}
                {roadbook.profile ? ` · ${roadbook.profile}` : ""}
              </Text>
            </View>
          ) : null}
          {roadbook.travel_mode ? (
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Modalité</Text>
              <Text style={styles.statValue}>{roadbook.travel_mode}</Text>
            </View>
          ) : null}
          {roadbook.budget_range ? (
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Budget</Text>
              <Text style={styles.statValue}>{roadbook.budget_range}</Text>
            </View>
          ) : null}
          {roadbook.theme ? (
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Thème</Text>
              <Text style={styles.statValue}>{roadbook.theme}</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.pageNumber} fixed render={({ pageNumber }) => (
          <>
            <Text>{pageMeta}</Text>
            <Text>{`${pageNumber}`}</Text>
          </>
        )} />
      </Page>

      {/* ---------- Map ---------- */}
      {mapUrl ? (
        <Page size="A4" style={styles.page}>
          <View style={styles.pageHeader}>
            <Text style={styles.brandMini}>Roadbook.ai</Text>
            <Text style={styles.pageMeta}>Tracé du voyage</Text>
          </View>
          <Text style={styles.sectionEyebrow}>Tracé du voyage</Text>
          <Text style={styles.h1}>Itinéraire général</Text>
          <View style={styles.rule} />

          {/* Cadre éditorial autour de la carte — donne un effet "encadré" */}
          <View style={styles.mapFrame}>
            <Image style={styles.mapImg} src={mapUrl} />
          </View>

          <Text style={styles.mapCaption}>
            Tracé du voyage avec étapes numérotées
            {roadbook.directions_segments &&
            roadbook.directions_segments.length > 0
              ? " · routes réelles calculées"
              : ""}
            .
          </Text>

          {/* Mini-stats — distance / route / hébergements */}
          {(() => {
            const totalKm = days.reduce(
              (acc, d) => acc + (d.distance_km || 0),
              0,
            );
            const totalH = days.reduce(
              (acc, d) => acc + (d.drive_hours || 0),
              0,
            );
            const stops = accommodations.length || days.length;
            return (
              <View style={styles.mapStatsRow}>
                <View style={styles.mapStatCell}>
                  <Text style={styles.mapStatLabel}>Distance</Text>
                  <View style={{ flexDirection: "row", alignItems: "baseline" }}>
                    <Text style={styles.mapStatValue}>
                      {totalKm > 0 ? totalKm.toLocaleString("fr-FR") : "—"}
                    </Text>
                    {totalKm > 0 ? (
                      <Text style={styles.mapStatUnit}>km</Text>
                    ) : null}
                  </View>
                </View>
                <View style={styles.mapStatCell}>
                  <Text style={styles.mapStatLabel}>Route</Text>
                  <View style={{ flexDirection: "row", alignItems: "baseline" }}>
                    <Text style={styles.mapStatValue}>
                      {totalH > 0 ? totalH.toFixed(1).replace(".", ",") : "—"}
                    </Text>
                    {totalH > 0 ? (
                      <Text style={styles.mapStatUnit}>h</Text>
                    ) : null}
                  </View>
                </View>
                <View style={styles.mapStatCell}>
                  <Text style={styles.mapStatLabel}>Étapes</Text>
                  <Text style={styles.mapStatValue}>{days.length}</Text>
                </View>
                <View style={styles.mapStatCell}>
                  <Text style={styles.mapStatLabel}>Hébergements</Text>
                  <Text style={styles.mapStatValue}>{stops}</Text>
                </View>
              </View>
            );
          })()}

          {/* Légende des étapes — uniquement si voyage court (≤ 9 jours)
              pour rester lisible. Pour les longs voyages, on s'appuie sur
              le sommaire jour par jour des pages suivantes. */}
          {days.length <= 9 && days.length > 0 ? (
            <View style={styles.mapLegendRow}>
              {days.map((d) => (
                <View key={`legend-${d.day}`} style={styles.mapLegendItem}>
                  <Text style={styles.mapLegendNum}>{d.day}</Text>
                  <Text style={styles.mapLegendText}>
                    {d.stage || d.accommodation || "Étape"}
                  </Text>
                </View>
              ))}
            </View>
          ) : null}

          <View style={styles.pageNumber} fixed render={({ pageNumber }) => (
            <>
              <Text>{pageMeta}</Text>
              <Text>{`${pageNumber}`}</Text>
            </>
          )} />
        </Page>
      ) : null}

      {/* ---------- Itinerary ---------- */}
      {dayPages.map((group, gi) => (
        <Page key={`itin-${gi}`} size="A4" style={styles.page}>
          <View style={styles.pageHeader}>
            <Text style={styles.brandMini}>Roadbook.ai</Text>
            <Text style={styles.pageMeta}>
              Itinéraire jour par jour
            </Text>
          </View>
          {gi === 0 ? (
            <>
              <Text style={styles.h1}>Itinéraire</Text>
              <View style={styles.rule} />
            </>
          ) : null}

          {group.map((d) => (
            <View key={`d-${d.day}`} style={styles.day} wrap={false}>
              <View style={styles.dayHead}>
                <Text style={styles.dayNum}>Jour {d.day}</Text>
                <Text style={styles.dayDate}>{formatDateFR(d.date)}</Text>
              </View>
              {d.stage ? <Text style={styles.dayStage}>{d.stage}</Text> : null}
              {d.accommodation && d.accommodation !== "—" ? (
                <Text style={styles.dayLine}>
                  Hébergement : {d.accommodation}
                  {d.type ? ` · ${d.type}` : ""}
                </Text>
              ) : null}
              <Text style={styles.dayMeta}>
                {[
                  d.distance_km && d.distance_km > 0
                    ? `${d.distance_km} km`
                    : null,
                  d.drive_hours && d.drive_hours > 0
                    ? `${d.drive_hours} h de route`
                    : null,
                  d.flight && d.flight !== "—" ? d.flight : null,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </Text>
              {d.narrative ? (
                <Text style={styles.dayNarrative}>{d.narrative}</Text>
              ) : null}
              {d.photos && d.photos.length > 0 ? (
                <>
                  <View style={styles.dayPhotosRow}>
                    {d.photos.slice(0, 3).map((p, idx) => (
                      <Image
                        key={`photo-${idx}`}
                        src={p.url}
                        style={styles.dayPhoto}
                      />
                    ))}
                  </View>
                  {/* Crédit photographe si Pexels (obligation) */}
                  {d.photos.some((p) => p.credit) ? (
                    <Text style={styles.dayPhotoCredit}>
                      {d.photos
                        .slice(0, 3)
                        .map((p) => p.credit)
                        .filter(Boolean)
                        .join(" · ")}
                    </Text>
                  ) : null}
                </>
              ) : null}
            </View>
          ))}

          <View style={styles.pageNumber} fixed render={({ pageNumber }) => (
            <>
              <Text>{pageMeta}</Text>
              <Text>{`${pageNumber}`}</Text>
            </>
          )} />
        </Page>
      ))}

      {/* ---------- Accommodations ---------- */}
      {accommodations.length > 0 ? (
        <Page size="A4" style={styles.page}>
          <View style={styles.pageHeader}>
            <Text style={styles.brandMini}>Roadbook.ai</Text>
            <Text style={styles.pageMeta}>Hébergements</Text>
          </View>
          <Text style={styles.sectionEyebrow}>Hébergements</Text>
          <Text style={styles.h1}>Où vous dormirez</Text>
          <View style={styles.rule} />
          <View style={styles.table}>
            <View style={styles.tableHead}>
              <Text style={[styles.tableHeadCell, { width: "38%" }]}>Lodge / Camp</Text>
              <Text style={[styles.tableHeadCell, { width: "30%" }]}>Localisation</Text>
              <Text style={[styles.tableHeadCell, { width: "20%" }]}>Type</Text>
              <Text style={[styles.tableHeadCell, { width: "12%", textAlign: "right" }]}>Nuits</Text>
            </View>
            {accommodations.map((a, i) => (
              <View
                key={i}
                style={[styles.tableRow, i % 2 === 1 ? styles.tableRowAlt : {}]}
                wrap={false}
              >
                <Text style={[styles.tableCell, { width: "38%", fontWeight: 600 }]}>{a.name}</Text>
                <Text style={[styles.tableCell, { width: "30%" }]}>{a.location}</Text>
                <Text style={[styles.tableCell, { width: "20%", color: MUTED }]}>{a.type}</Text>
                <Text style={[styles.tableCell, { width: "12%", textAlign: "right" }]}>{a.nights}</Text>
              </View>
            ))}
          </View>
          <View style={styles.pageNumber} fixed render={({ pageNumber }) => (
            <>
              <Text>{pageMeta}</Text>
              <Text>{`${pageNumber}`}</Text>
            </>
          )} />
        </Page>
      ) : null}

      {/* ---------- Contacts ---------- */}
      {contacts.length > 0 ? (
        <Page size="A4" style={styles.page}>
          <View style={styles.pageHeader}>
            <Text style={styles.brandMini}>Roadbook.ai</Text>
            <Text style={styles.pageMeta}>Contacts pratiques</Text>
          </View>
          <Text style={styles.sectionEyebrow}>Contacts pratiques</Text>
          <Text style={styles.h1}>À garder sous la main</Text>
          <View style={styles.rule} />
          {contacts.map((c, i) => (
            <View key={i} style={styles.contactBlock} wrap={false}>
              <Text style={styles.contactRole}>{c.role}</Text>
              <Text style={styles.contactName}>{c.name}</Text>
              {c.phone ? <Text style={styles.contactLine}>{c.phone}</Text> : null}
              {c.email ? (
                <Text style={[styles.contactLine, { color: MUTED }]}>{c.email}</Text>
              ) : null}
            </View>
          ))}
          <View style={styles.pageNumber} fixed render={({ pageNumber }) => (
            <>
              <Text>{pageMeta}</Text>
              <Text>{`${pageNumber}`}</Text>
            </>
          )} />
        </Page>
      ) : null}

      {/* ---------- Tips ---------- */}
      {tips.length > 0 ? (
        <Page size="A4" style={styles.page}>
          <View style={styles.pageHeader}>
            <Text style={styles.brandMini}>Roadbook.ai</Text>
            <Text style={styles.pageMeta}>Conseils</Text>
          </View>
          <Text style={styles.sectionEyebrow}>Conseils &amp; recommandations</Text>
          <Text style={styles.h1}>Pour bien préparer le voyage</Text>
          <View style={styles.rule} />
          {tips.map((t, i) => (
            <View key={i} style={styles.tipRow} wrap={false}>
              <Text style={styles.tipBullet}>•</Text>
              <Text style={styles.tipText}>{t}</Text>
            </View>
          ))}
          <View style={styles.pageNumber} fixed render={({ pageNumber }) => (
            <>
              <Text>{pageMeta}</Text>
              <Text>{`${pageNumber}`}</Text>
            </>
          )} />
        </Page>
      ) : null}

      {/* ---------- End page ---------- */}
      <Page size="A4" style={styles.endPage}>
        <Text style={styles.eyebrow}>Bon voyage</Text>
        <Text style={styles.endTitle}>{cover.title || destination}</Text>
        <Text style={styles.endText}>Roadbook préparé avec soin</Text>
        <Text style={styles.endText}>Généré le {generatedOn}</Text>
        <Text style={styles.endBrand}>roadbook.ai</Text>
      </Page>
    </Document>
  );
}

export default RoadbookPDF;
