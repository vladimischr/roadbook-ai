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
// Use TTF mirrors (react-pdf doesn't support woff2).
Font.register({
  family: "Inter",
  fonts: [
    {
      src: "https://cdn.jsdelivr.net/fontsource/fonts/inter@latest/latin-400-normal.ttf",
      fontWeight: 400,
    },
    {
      src: "https://cdn.jsdelivr.net/fontsource/fonts/inter@latest/latin-500-normal.ttf",
      fontWeight: 500,
    },
    {
      src: "https://cdn.jsdelivr.net/fontsource/fonts/inter@latest/latin-600-normal.ttf",
      fontWeight: 600,
    },
    {
      src: "https://cdn.jsdelivr.net/fontsource/fonts/inter@latest/latin-700-normal.ttf",
      fontWeight: 700,
    },
    {
      src: "https://cdn.jsdelivr.net/fontsource/fonts/inter@latest/latin-400-italic.ttf",
      fontWeight: 400,
      fontStyle: "italic",
    },
  ],
});

Font.register({
  family: "Playfair",
  fonts: [
    {
      src: "https://cdn.jsdelivr.net/fontsource/fonts/playfair-display@latest/latin-400-normal.ttf",
      fontWeight: 400,
    },
    {
      src: "https://cdn.jsdelivr.net/fontsource/fonts/playfair-display@latest/latin-600-normal.ttf",
      fontWeight: 600,
    },
    {
      src: "https://cdn.jsdelivr.net/fontsource/fonts/playfair-display@latest/latin-700-normal.ttf",
      fontWeight: 700,
    },
    {
      src: "https://cdn.jsdelivr.net/fontsource/fonts/playfair-display@latest/latin-400-italic.ttf",
      fontWeight: 400,
      fontStyle: "italic",
    },
  ],
});

// Avoid hyphenation on words for cleaner editorial layout.
Font.registerHyphenationCallback((word) => [word]);

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
  mapImg: {
    width: "100%",
    height: 360,
    objectFit: "cover",
    borderRadius: 6,
    marginTop: 6,
  },
  mapCaption: {
    marginTop: 10,
    fontSize: 9.5,
    color: MUTED,
    fontStyle: "italic",
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

function buildStaticMapUrl(
  days: NonNullable<RoadbookContent["days"]>,
  apiKey?: string,
): string | null {
  if (!apiKey) return null;
  const points = days
    .filter((d) => typeof d.lat === "number" && typeof d.lng === "number")
    .map((d) => ({ day: d.day, lat: d.lat as number, lng: d.lng as number }));
  if (points.length === 0) return null;

  const base = "https://maps.googleapis.com/maps/api/staticmap";
  const params = new URLSearchParams();
  params.set("size", "640x400");
  params.set("scale", "2");
  params.set("maptype", "roadmap");

  // Minimalist style: hide POIs, transit, business labels.
  const styleRules = [
    "feature:poi|visibility:off",
    "feature:transit|visibility:off",
    "feature:road|element:labels.icon|visibility:off",
    "feature:administrative.locality|element:labels|visibility:on",
  ];
  styleRules.forEach((s) => params.append("style", s));

  // Markers (one per day)
  points.forEach((p) => {
    params.append(
      "markers",
      `color:0x0F6E56|label:${p.day <= 9 ? p.day : ""}|${p.lat},${p.lng}`,
    );
  });

  // Path (polyline as ordered list of lat,lng)
  if (points.length >= 2) {
    const pathPts = points.map((p) => `${p.lat},${p.lng}`).join("|");
    params.append("path", `color:0x0F6E56FF|weight:3|${pathPts}`);
  }

  params.set("key", apiKey);
  return `${base}?${params.toString()}`;
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
}: {
  roadbook: RoadbookContent;
  mapsApiKey?: string;
}) {
  const cover = roadbook.cover || {};
  const days = roadbook.days || [];
  const accommodations = roadbook.accommodations_summary || [];
  const contacts = roadbook.contacts || [];
  const tips = roadbook.tips || [];
  const destination = roadbook.destination || cover.title || "Voyage";
  const mapUrl = buildStaticMapUrl(days, mapsApiKey);
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
        <Text style={styles.coverFooter}>Préparé avec Roadbook.ai</Text>
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
          <Image style={styles.mapImg} src={mapUrl} />
          <Text style={styles.mapCaption}>
            Carte schématique des étapes principales — distances et tracés indicatifs.
          </Text>
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
