import { useEffect, useMemo, useState } from "react";
import {
  AdvancedMarker,
  InfoWindow,
  Map,
  useMap,
} from "@vis.gl/react-google-maps";

export interface MapDay {
  day: number;
  stage: string;
  accommodation: string;
  date?: string;
  lat?: number | null;
  lng?: number | null;
}

interface Props {
  days: MapDay[];
}

const TEAL = "#0F6E56";

/**
 * Carte interactive du voyage. Affiche un marker numéroté par jour avec
 * lat/lng, relie les jours dans l'ordre par une polyline teal, et
 * fitBounds au mount + à chaque changement des points.
 *
 * À monter à l'intérieur d'un <APIProvider>.
 */
export function RoadbookMap({ days }: Props) {
  const points = useMemo(
    () =>
      days.filter(
        (d) =>
          typeof d.lat === "number" &&
          typeof d.lng === "number" &&
          !Number.isNaN(d.lat) &&
          !Number.isNaN(d.lng),
      ) as Array<MapDay & { lat: number; lng: number }>,
    [days],
  );

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
      <Map
        mapId="roadbook-map"
        style={{ width: "100%", height: "450px" }}
        defaultCenter={center}
        defaultZoom={5}
        gestureHandling="greedy"
        disableDefaultUI={false}
      >
        <FitBoundsAndPolyline points={points} />
        {points.map((p) => (
          <DayMarker key={`m-${p.day}`} point={p} />
        ))}
      </Map>
    </div>
  );
}

function FitBoundsAndPolyline({
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

  useEffect(() => {
    if (!map || points.length < 2) return;
    const polyline = new google.maps.Polyline({
      path: points.map((p) => ({ lat: p.lat, lng: p.lng })),
      geodesic: true,
      strokeColor: TEAL,
      strokeOpacity: 0.8,
      strokeWeight: 3,
    });
    polyline.setMap(map);
    return () => polyline.setMap(null);
  }, [map, points]);

  return null;
}

function DayMarker({
  point,
}: {
  point: MapDay & { lat: number; lng: number };
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <AdvancedMarker
        position={{ lat: point.lat, lng: point.lng }}
        onClick={() => setOpen((v) => !v)}
        title={`Jour ${point.day} — ${point.stage}`}
      >
        <div
          style={{
            background: TEAL,
            color: "white",
            width: 32,
            height: 32,
            borderRadius: "50%",
            display: "grid",
            placeItems: "center",
            fontSize: 12,
            fontWeight: 700,
            border: "2px solid white",
            boxShadow: "0 2px 6px rgba(0,0,0,0.25)",
          }}
        >
          J{point.day}
        </div>
      </AdvancedMarker>
      {open && (
        <InfoWindow
          position={{ lat: point.lat, lng: point.lng }}
          pixelOffset={[0, -34]}
          onCloseClick={() => setOpen(false)}
          headerDisabled
        >
          <div className="min-w-[180px] space-y-1 p-1">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-[#0F6E56]">
              Jour {point.day}
            </div>
            <div className="text-sm font-medium text-foreground">
              {point.stage || "—"}
            </div>
            {point.accommodation && (
              <div className="text-xs text-muted-foreground">
                {point.accommodation}
              </div>
            )}
            {point.date && (
              <div className="text-xs text-muted-foreground">{point.date}</div>
            )}
          </div>
        </InfoWindow>
      )}
    </>
  );
}
