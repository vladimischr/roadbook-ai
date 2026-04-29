/// <reference types="google.maps" />
import { useEffect, useMemo, useRef, useState } from "react";
import {
  AdvancedMarker,
  InfoWindow,
  Map as GMap,
  useMap,
} from "@vis.gl/react-google-maps";
import { getDirectionsSegment } from "@/server/maps.functions";

export interface MapDay {
  day: number;
  stage: string;
  accommodation: string;
  type?: string;
  date?: string;
  distance_km?: number;
  drive_hours?: number;
  flight?: string;
  lat?: number | null;
  lng?: number | null;
}

export interface DirectionsSegment {
  from_day: number;
  to_day: number;
  encoded_polyline: string | null;
  distance_meters: number | null;
  duration_seconds: number | null;
  /** "driving" si Directions OK, "flight" pour pointillé aérien, "fallback" pour ligne droite après échec. */
  mode: "driving" | "flight" | "fallback";
}

interface Props {
  days: MapDay[];
  /** Cache existant lu/écrit dans le content jsonb. */
  segments?: DirectionsSegment[];
  /** Appelé quand de nouveaux segments sont calculés (à persister). */
  onSegmentsChange?: (segs: DirectionsSegment[]) => void;
}

const TEAL = "#0F6E56";
const TEAL_LIGHT = "#1D9E75";

/* ---------- Utilitaires ---------- */

function isNum(n: unknown): n is number {
  return typeof n === "number" && Number.isFinite(n);
}

function distanceKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
) {
  const R = 6371;
  const toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

function looksLikeFlight(d: MapDay): boolean {
  const flight = (d.flight || "").trim();
  if (flight && flight !== "—" && flight.length > 0) return true;
  const txt = `${d.type ?? ""}`.toLowerCase();
  return txt.includes("vol");
}

function formatFrDate(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/* ---------- Fusion des jours co-localisés ---------- */

interface MarkerCluster {
  lat: number;
  lng: number;
  /** Jours fusionnés sur ce marker (au moins 1). */
  days: Array<MapDay & { lat: number; lng: number }>;
}

function clusterDays(
  points: Array<MapDay & { lat: number; lng: number }>,
): MarkerCluster[] {
  const clusters: MarkerCluster[] = [];
  for (const p of points) {
    const found = clusters.find(
      (c) => distanceKm({ lat: c.lat, lng: c.lng }, p) < 5,
    );
    if (found) {
      found.days.push(p);
    } else {
      clusters.push({ lat: p.lat, lng: p.lng, days: [p] });
    }
  }
  return clusters;
}

/* ---------- Composant principal ---------- */

export function RoadbookMap({ days, segments, onSegmentsChange }: Props) {
  const points = useMemo(
    () =>
      days.filter(
        (d) => isNum(d.lat) && isNum(d.lng),
      ) as Array<MapDay & { lat: number; lng: number }>,
    [days],
  );

  const clusters = useMemo(() => clusterDays(points), [points]);

  const center = points[0]
    ? { lat: points[0].lat, lng: points[0].lng }
    : { lat: 0, lng: 20 };

  if (points.length === 0) {
    return (
      <div className="grid h-[450px] place-items-center rounded-xl border border-dashed border-border bg-secondary/30 text-sm text-muted-foreground">
        Géocodage des étapes en cours… La carte apparaîtra dès que les lieux
        seront localisés.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border">
      <GMap
        mapId="roadbook-map"
        style={{ width: "100%", height: "450px" }}
        defaultCenter={center}
        defaultZoom={5}
        gestureHandling="greedy"
        disableDefaultUI={false}
      >
        <FitBounds points={points} />
        <RouteRenderer
          days={days}
          points={points}
          segments={segments ?? []}
          onSegmentsChange={onSegmentsChange}
        />
        {clusters.map((c, idx) => (
          <ClusterMarker key={`m-${idx}`} cluster={c} />
        ))}
      </GMap>
    </div>
  );
}

/* ---------- FitBounds ---------- */

function FitBounds({
  points,
}: {
  points: Array<MapDay & { lat: number; lng: number }>;
}) {
  const map = useMap();
  useEffect(() => {
    if (!map || points.length === 0) return;
    if (points.length === 1) {
      map.setCenter({ lat: points[0].lat, lng: points[0].lng });
      map.setZoom(8);
      return;
    }
    const bounds = new google.maps.LatLngBounds();
    points.forEach((p) => bounds.extend({ lat: p.lat, lng: p.lng }));
    map.fitBounds(bounds, 60);
  }, [map, points]);
  return null;
}

/* ---------- Routes (tracé réel + cache + segments avion) ---------- */

function segmentKey(fromDay: number, toDay: number) {
  return `${fromDay}-${toDay}`;
}

function RouteRenderer({
  days,
  points,
  segments,
  onSegmentsChange,
}: {
  days: MapDay[];
  points: Array<MapDay & { lat: number; lng: number }>;
  segments: DirectionsSegment[];
  onSegmentsChange?: (segs: DirectionsSegment[]) => void;
}) {
  const map = useMap();
  // Polylines en cours sur la carte → cleanup lifecycle
  const drawnRef = useRef<google.maps.Polyline[]>([]);
  // Segments calculés à la volée pendant la session (évite re-fetch si parent
  // n'a pas encore persisté).
  const sessionRef = useRef<Map<string, DirectionsSegment>>(new Map());
  // Map des paires consécutives présentes dans days (pour invalider les
  // segments cachés dont la pair n'existe plus après réorganisation).
  const validKeys = useMemo(() => {
    const set = new Set<string>();
    for (let i = 0; i < days.length - 1; i++) {
      set.add(segmentKey(days[i].day, days[i + 1].day));
    }
    return set;
  }, [days]);

  // Nettoie le cache de segments obsolètes (paires qui n'existent plus)
  useEffect(() => {
    if (!onSegmentsChange) return;
    const cleaned = segments.filter((s) =>
      validKeys.has(segmentKey(s.from_day, s.to_day)),
    );
    if (cleaned.length !== segments.length) {
      onSegmentsChange(cleaned);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [validKeys]);

  useEffect(() => {
    if (!map) return;

    // Cleanup polylines précédentes
    drawnRef.current.forEach((p) => p.setMap(null));
    drawnRef.current = [];

    // Construit la liste des paires consécutives dans l'ordre des `days`
    const pairs: Array<{
      from: MapDay & { lat: number; lng: number };
      to: MapDay & { lat: number; lng: number };
    }> = [];
    for (let i = 0; i < days.length - 1; i++) {
      const a = days[i];
      const b = days[i + 1];
      if (isNum(a.lat) && isNum(a.lng) && isNum(b.lat) && isNum(b.lng)) {
        pairs.push({
          from: a as MapDay & { lat: number; lng: number },
          to: b as MapDay & { lat: number; lng: number },
        });
      }
    }

    let cancelled = false;
    const newlyComputed: DirectionsSegment[] = [];

    const drawSegment = (seg: DirectionsSegment, from: { lat: number; lng: number }, to: { lat: number; lng: number }) => {
      if (cancelled || !map) return;
      let path: google.maps.LatLngLiteral[] | null = null;
      if (seg.encoded_polyline && seg.mode === "driving") {
        try {
          const decoded = google.maps.geometry.encoding.decodePath(
            seg.encoded_polyline,
          );
          path = decoded.map((p) => ({ lat: p.lat(), lng: p.lng() }));
        } catch (e) {
          console.warn("Polyline decode failed", e);
        }
      }
      if (!path) {
        path = [
          { lat: from.lat, lng: from.lng },
          { lat: to.lat, lng: to.lng },
        ];
      }

      const isDashed = seg.mode !== "driving";
      const polyline = new google.maps.Polyline({
        path,
        geodesic: true,
        strokeColor: isDashed ? TEAL_LIGHT : TEAL,
        strokeOpacity: isDashed ? 0 : 0.85,
        strokeWeight: 4,
        icons: isDashed
          ? [
              {
                icon: {
                  path: "M 0,-1 0,1",
                  strokeOpacity: 0.9,
                  strokeColor: TEAL_LIGHT,
                  strokeWeight: 3,
                  scale: 3,
                },
                offset: "0",
                repeat: "12px",
              },
            ]
          : undefined,
      });
      // line-cap round (sur Polyline c'est implicite — strokeWeight rendu rond)
      polyline.setMap(map);
      drawnRef.current.push(polyline);
    };

    const findCached = (from: MapDay, to: MapDay): DirectionsSegment | null => {
      const k = segmentKey(from.day, to.day);
      return (
        sessionRef.current.get(k) ??
        segments.find((s) => segmentKey(s.from_day, s.to_day) === k) ??
        null
      );
    };

    (async () => {
      for (const { from, to } of pairs) {
        if (cancelled) return;
        // Vol → segment droit pointillé (jamais Directions)
        const isFlight = looksLikeFlight(to);

        const cached = findCached(from, to);
        if (cached) {
          drawSegment(cached, from, to);
          continue;
        }

        if (isFlight) {
          const seg: DirectionsSegment = {
            from_day: from.day,
            to_day: to.day,
            encoded_polyline: null,
            distance_meters: null,
            duration_seconds: null,
            mode: "flight",
          };
          sessionRef.current.set(segmentKey(from.day, to.day), seg);
          newlyComputed.push(seg);
          drawSegment(seg, from, to);
          continue;
        }

        // Driving via Directions API
        try {
          const res = await getDirectionsSegment({
            data: {
              from: { lat: from.lat, lng: from.lng },
              to: { lat: to.lat, lng: to.lng },
            },
          });
          if (cancelled) return;
          const seg: DirectionsSegment = res.ok
            ? {
                from_day: from.day,
                to_day: to.day,
                encoded_polyline: res.encoded_polyline,
                distance_meters: res.distance_meters,
                duration_seconds: res.duration_seconds,
                mode: "driving",
              }
            : {
                from_day: from.day,
                to_day: to.day,
                encoded_polyline: null,
                distance_meters: null,
                duration_seconds: null,
                mode: "fallback",
              };
          sessionRef.current.set(segmentKey(from.day, to.day), seg);
          newlyComputed.push(seg);
          drawSegment(seg, from, to);
        } catch (e) {
          console.error("Directions error", e);
          const seg: DirectionsSegment = {
            from_day: from.day,
            to_day: to.day,
            encoded_polyline: null,
            distance_meters: null,
            duration_seconds: null,
            mode: "fallback",
          };
          sessionRef.current.set(segmentKey(from.day, to.day), seg);
          newlyComputed.push(seg);
          drawSegment(seg, from, to);
        }
      }

      // Persister les nouveaux segments une fois la pass terminée
      if (!cancelled && newlyComputed.length > 0 && onSegmentsChange) {
        const merged = [
          ...segments.filter(
            (s) =>
              !newlyComputed.some(
                (n) => n.from_day === s.from_day && n.to_day === s.to_day,
              ) && validKeys.has(segmentKey(s.from_day, s.to_day)),
          ),
          ...newlyComputed,
        ];
        onSegmentsChange(merged);
      }
    })();

    return () => {
      cancelled = true;
      drawnRef.current.forEach((p) => p.setMap(null));
      drawnRef.current = [];
    };
    // points est inclus pour redessiner si lat/lng changent
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, points, days]);

  return null;
}

/* ---------- Marker (avec fusion) ---------- */

function ClusterMarker({ cluster }: { cluster: MarkerCluster }) {
  const [open, setOpen] = useState(false);
  const [hover, setHover] = useState(false);
  const sortedDays = [...cluster.days].sort((a, b) => a.day - b.day);
  const isMulti = sortedDays.length > 1;
  const label = isMulti
    ? `J${sortedDays[0].day}-J${sortedDays[sortedDays.length - 1].day}`
    : `J${sortedDays[0].day}`;

  return (
    <>
      <AdvancedMarker
        position={{ lat: cluster.lat, lng: cluster.lng }}
        onClick={() => setOpen((v) => !v)}
        title={
          isMulti
            ? `Jours ${sortedDays[0].day} à ${sortedDays[sortedDays.length - 1].day}`
            : `Jour ${sortedDays[0].day} — ${sortedDays[0].stage}`
        }
      >
        <div
          onMouseEnter={() => setHover(true)}
          onMouseLeave={() => setHover(false)}
          style={{
            background: TEAL,
            color: "white",
            minWidth: isMulti ? 48 : 34,
            height: 34,
            padding: isMulti ? "0 10px" : 0,
            borderRadius: 999,
            display: "grid",
            placeItems: "center",
            fontSize: isMulti ? 11 : 12,
            fontWeight: 700,
            letterSpacing: 0.2,
            border: "2px solid white",
            boxShadow:
              "0 4px 10px rgba(15, 110, 86, 0.35), 0 1px 3px rgba(0,0,0,0.18)",
            transform: hover ? "scale(1.15)" : "scale(1)",
            transition: "transform 180ms cubic-bezier(.2,.7,.3,1.2)",
            cursor: "pointer",
            whiteSpace: "nowrap",
          }}
        >
          {label}
        </div>
      </AdvancedMarker>
      {open && (
        <InfoWindow
          position={{ lat: cluster.lat, lng: cluster.lng }}
          pixelOffset={[0, -38]}
          onCloseClick={() => setOpen(false)}
          headerDisabled
        >
          <div className="min-w-[220px] max-w-[280px] space-y-3 p-1">
            {sortedDays.map((d) => (
              <DayInfoBlock key={d.day} day={d} />
            ))}
          </div>
        </InfoWindow>
      )}
    </>
  );
}

function DayInfoBlock({ day }: { day: MapDay }) {
  const showDistance =
    (day.distance_km ?? 0) > 0 || (day.drive_hours ?? 0) > 0;
  const showFlight = day.flight && day.flight.trim() && day.flight !== "—";
  return (
    <div className="space-y-1 border-b border-border/50 pb-2 last:border-0 last:pb-0">
      <div
        className="text-[10px] font-semibold uppercase tracking-[0.18em]"
        style={{ color: TEAL }}
      >
        Jour {day.day}
      </div>
      <div className="text-sm font-semibold leading-tight text-foreground">
        {day.stage || "—"}
      </div>
      {(day.accommodation || day.type) && (
        <div className="text-xs text-muted-foreground">
          {[day.accommodation, day.type].filter(Boolean).join(" · ")}
        </div>
      )}
      {day.date && (
        <div className="text-xs text-muted-foreground">
          {formatFrDate(day.date)}
        </div>
      )}
      {showDistance && (
        <div className="text-xs text-muted-foreground">
          {day.distance_km ?? 0} km · {day.drive_hours ?? 0} h
        </div>
      )}
      {showFlight && (
        <div className="text-xs" style={{ color: TEAL }}>
          ✈ {day.flight}
        </div>
      )}
    </div>
  );
}
