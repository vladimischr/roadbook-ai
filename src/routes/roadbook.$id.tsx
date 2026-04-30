import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronDown,
  Download,
  Pencil,
  Check,
  X,
  Lightbulb,
  Loader2,
  Plus,
  Trash2,
  GripVertical,
  Sparkles,
  MapPin,
  Clock,
  Plane,
  Phone,
  Mail,
  BedDouble,
  Tent,
  Hotel,
  Home as HomeIcon,
  Building2,
  CloudCheck,
  CloudUpload,
} from "lucide-react";
import { useScrollReveal, staggerStyle } from "@/lib/animations";
import { AppShell, useTopbarSlot, BreadcrumbLine } from "@/components/AppShell";
import { SectionErrorBoundary } from "@/components/SectionErrorBoundary";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { APIProvider } from "@vis.gl/react-google-maps";
import { useGoogleMapsKey } from "@/lib/useGoogleMapsKey";
import { useDestinationCover } from "@/lib/useDestinationCover";
import { RoadbookMap, type DirectionsSegment } from "@/components/RoadbookMap";
import { PlacesAutocompleteInput, type PlaceSelection } from "@/components/PlacesAutocompleteInput";
import { geocodePlace, getDirectionsSegment } from "@/server/maps.functions";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

export const Route = createFileRoute("/roadbook/$id")({
  component: RoadbookPage,
  head: () => ({ meta: [{ title: "Roadbook — Roadbook.ai" }] }),
});

interface Cover {
  title: string;
  subtitle: string;
  tagline: string;
  dates_label: string;
}
interface Day {
  day: number;
  date: string;
  stage: string;
  accommodation: string;
  type: string;
  distance_km: number;
  drive_hours: number;
  flight: string;
  narrative: string;
  lat?: number | null;
  lng?: number | null;
  narrative_user_modified?: boolean;
}
interface AccommodationSummary {
  name: string;
  location: string;
  nights: number;
  type: string;
}
interface Contact {
  role: string;
  name: string;
  phone: string;
  email?: string;
}
interface Roadbook {
  client_name: string;
  destination: string;
  start_date: string;
  end_date: string;
  duration_days?: number;
  travelers?: number;
  profile?: string;
  theme?: string;
  travel_mode?: string;
  budget_range?: string;
  cover: Cover;
  overview: string;
  days: Day[];
  accommodations_summary: AccommodationSummary[];
  contacts: Contact[];
  tips: string[];
  directions_segments?: DirectionsSegment[];
}

type RoadbookStatus = "draft" | "ready" | "delivered" | "archived";
const STATUS_LABEL: Record<RoadbookStatus, string> = {
  draft: "Brouillon",
  ready: "Prêt",
  delivered: "Livré",
  archived: "Archivé",
};
function normalizeStatus(s: string | null | undefined): RoadbookStatus {
  if (s === "ready" || s === "delivered" || s === "archived") return s;
  return "draft";
}

/* Icon mapping for accommodations */
function accommodationIcon(type: string) {
  const t = (type || "").toLowerCase();
  if (/lodge/.test(t)) return HomeIcon;
  if (/camp|tent/.test(t)) return Tent;
  if (/h[oô]tel/.test(t)) return Hotel;
  if (/appart|apartment/.test(t)) return Building2;
  if (/vol|fly|plane|avion/.test(t)) return Plane;
  return BedDouble;
}

function formatShortDate(iso: string) {
  if (!iso) return "";
  if (iso.includes("/")) return iso;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
}

function emptyDay(nextNum: number): Day {
  return {
    day: nextNum,
    date: "",
    stage: "",
    accommodation: "",
    type: "",
    distance_km: 0,
    drive_hours: 0,
    flight: "—",
    narrative: "",
  };
}

function emptyAccommodation(): AccommodationSummary {
  return { name: "", location: "", nights: 1, type: "Lodge" };
}

function emptyContact(): Contact {
  return { role: "", name: "", phone: "", email: "" };
}

function renumberDays(list: Day[]): Day[] {
  return list.map((d, i) => ({ ...d, day: i + 1 }));
}

/* ---------- Normalize legacy/incomplete roadbook content ---------- */

function asNumber(v: unknown, fallback = 0): number {
  const n = typeof v === "number" ? v : typeof v === "string" ? parseFloat(v) : NaN;
  return Number.isFinite(n) ? n : fallback;
}
function asString(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v : fallback;
}

/**
 * Garantit qu'un objet content respecte la forme `Roadbook` complète, avec des
 * valeurs par défaut sûres pour tout champ manquant. Indispensable pour les
 * roadbooks créés avant la refonte (anciennes structures incomplètes) afin
 * d'éviter les crashs au rendu (ex: `.toFixed`, `.map` sur undefined).
 */
function normalizeRoadbookContent(raw: unknown): Roadbook {
  const c = (raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {}) as Record<string, unknown>;
  const cover = (c.cover && typeof c.cover === "object" ? (c.cover as Record<string, unknown>) : {}) as Record<string, unknown>;
  const destination = asString(c.destination);
  const daysRaw = Array.isArray(c.days) ? (c.days as unknown[]) : [];
  const days: Day[] = daysRaw.map((d, idx) => {
    const x = (d && typeof d === "object" ? (d as Record<string, unknown>) : {}) as Record<string, unknown>;
    const lat = typeof x.lat === "number" ? (x.lat as number) : null;
    const lng = typeof x.lng === "number" ? (x.lng as number) : null;
    return {
      day: asNumber(x.day, idx + 1),
      date: asString(x.date),
      stage: asString(x.stage ?? x.location),
      accommodation: asString(x.accommodation),
      type: asString(x.type),
      distance_km: asNumber(x.distance_km, 0),
      drive_hours: asNumber(x.drive_hours, 0),
      flight: asString(x.flight, "—"),
      narrative: asString(x.narrative ?? x.description),
      lat,
      lng,
      narrative_user_modified: x.narrative_user_modified === true,
    };
  });

  const accommodations_summary: AccommodationSummary[] = (
    Array.isArray(c.accommodations_summary) ? (c.accommodations_summary as unknown[]) : []
  ).map((a) => {
    const x = (a && typeof a === "object" ? (a as Record<string, unknown>) : {}) as Record<string, unknown>;
    return {
      name: asString(x.name),
      location: asString(x.location),
      nights: asNumber(x.nights, 1),
      type: asString(x.type),
    };
  });

  const contacts: Contact[] = (
    Array.isArray(c.contacts) ? (c.contacts as unknown[]) : []
  ).map((ct) => {
    const x = (ct && typeof ct === "object" ? (ct as Record<string, unknown>) : {}) as Record<string, unknown>;
    return {
      role: asString(x.role),
      name: asString(x.name),
      phone: asString(x.phone),
      email: asString(x.email),
    };
  });

  const tips: string[] = (Array.isArray(c.tips) ? (c.tips as unknown[]) : [])
    .map((t) => (typeof t === "string" ? t : ""))
    .filter((t) => t.length > 0);

  const directions_segments = Array.isArray(c.directions_segments)
    ? (c.directions_segments as DirectionsSegment[])
    : [];

  return {
    client_name: asString(c.client_name),
    destination,
    start_date: asString(c.start_date),
    end_date: asString(c.end_date),
    duration_days: typeof c.duration_days === "number" ? c.duration_days : days.length || undefined,
    travelers: typeof c.travelers === "number" ? c.travelers : undefined,
    profile: asString(c.profile) || undefined,
    theme: asString(c.theme) || undefined,
    travel_mode: asString(c.travel_mode) || undefined,
    budget_range: asString(c.budget_range) || undefined,
    cover: {
      title: asString(cover.title) || destination || "Voyage",
      subtitle: asString(cover.subtitle),
      tagline: asString(cover.tagline),
      dates_label: asString(cover.dates_label),
    },
    overview: asString(c.overview),
    days,
    accommodations_summary,
    contacts,
    tips,
    directions_segments,
  };
}

/* ---------- Page ---------- */

function RoadbookPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [rb, setRb] = useState<Roadbook | null>(null);
  const [loading, setLoading] = useState(true);
  const [globalEdit, setGlobalEdit] = useState(false);
  const [recomputeOpen, setRecomputeOpen] = useState(false);
  const [preserveModified, setPreserveModified] = useState(true);
  const [recomputing, setRecomputing] = useState(false);
  const [status, setStatus] = useState<RoadbookStatus>("draft");
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
  const [savingState, setSavingState] = useState<"idle" | "saving">("idle");
  const [geocodeStatus, setGeocodeStatus] = useState<"idle" | "running" | "done" | "failed">("idle");
  const [geocodeAttempt, setGeocodeAttempt] = useState(0);
  const { apiKey } = useGoogleMapsKey();
  const rbRef = useRef<Roadbook | null>(null);
  rbRef.current = rb;

  // Auto-save debounce
  const dirtyRef = useRef<Roadbook | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate({ to: "/login" });
      return;
    }
    supabase
      .from("roadbooks")
      .select("content,destination,status")
      .eq("id", id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error || !data) {
          toast.error("Roadbook introuvable");
          navigate({ to: "/dashboard" });
          return;
        }
        const content = normalizeRoadbookContent(data.content);
        if (!content.destination && data.destination) {
          content.destination = data.destination;
        }
        setRb(content);
        setStatus(normalizeStatus(data.status));
        setLoading(false);
      });
  }, [id, user, authLoading, navigate]);

  // Sauvegarde immédiate avec toast
  const persist = async (next: Roadbook) => {
    setRb(next);
    setSavingState("saving");
    const { error } = await supabase
      .from("roadbooks")
      .update({ content: next as never })
      .eq("id", id);
    setSavingState("idle");
    if (error) {
      toast.error("Échec de la sauvegarde : " + error.message);
    } else {
      setLastSavedAt(Date.now());
      toast.success("Modifications enregistrées", { duration: 1800 });
    }
  };

  // Sauvegarde silencieuse (géocodage, segments)
  const persistSilent = async (next: Roadbook) => {
    setRb(next);
    const { error } = await supabase
      .from("roadbooks")
      .update({ content: next as never })
      .eq("id", id);
    if (error) console.error("Silent persist failed:", error.message);
    else setLastSavedAt(Date.now());
  };

  // Auto-save (debounce 2s) — déclenché par updateAndAutosave
  const updateAndAutosave = (next: Roadbook) => {
    setRb(next);
    dirtyRef.current = next;
    setSavingState("saving");
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      const toSave = dirtyRef.current;
      if (!toSave) return;
      supabase
        .from("roadbooks")
        .update({ content: toSave as never })
        .eq("id", id)
        .then(({ error }) => {
          setSavingState("idle");
          if (error) {
            toast.error("Échec auto-save : " + error.message);
          } else {
            setLastSavedAt(Date.now());
          }
        });
    }, 1500);
  };

  // Mettre à jour le statut
  const updateStatus = async (next: RoadbookStatus) => {
    const prev = status;
    setStatus(next);
    const { error } = await supabase
      .from("roadbooks")
      .update({ status: next })
      .eq("id", id);
    if (error) {
      toast.error("Mise à jour du statut impossible : " + error.message);
      setStatus(prev);
    } else {
      toast.success(`Marqué comme ${STATUS_LABEL[next].toLowerCase()}`, { duration: 1800 });
    }
  };

  // Géocodage rétroactif
  useEffect(() => {
    if (!rb) return;
    const days = rb.days || [];
    const missing = days
      .map((d, idx) => ({ d, idx }))
      .filter(({ d }) => typeof d.lat !== "number" || typeof d.lng !== "number")
      .filter(({ d }) => (d.stage || d.accommodation || "").trim().length > 0);
    if (missing.length === 0) return;

    let cancelled = false;
    (async () => {
      let working = rbRef.current;
      if (!working) return;
      for (const { idx } of missing) {
        if (cancelled) return;
        const day = working.days[idx];
        if (!day) continue;
        if (typeof day.lat === "number" && typeof day.lng === "number") continue;
        const query = (day.stage || day.accommodation || "").trim();
        if (!query) continue;
        try {
          const res = await geocodePlace({
            data: { query, region: working.destination },
          });
          if (cancelled) return;
          if (res.lat == null || res.lng == null) continue;
          const nextDays: Day[] = working.days.map((d, i) =>
            i === idx ? { ...d, lat: res.lat, lng: res.lng } : d,
          );
          working = { ...working, days: nextDays };
          await persistSilent(working);
        } catch (e) {
          console.error("Geocode error:", e);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rb?.days?.length, id]);

  // Persistance segments cache (silencieuse)
  const handleSegmentsChange = (segs: DirectionsSegment[]) => {
    const cur = rbRef.current;
    if (!cur) return;
    persistSilent({ ...cur, directions_segments: segs });
  };

  // Invalide le cache directions_segments après une mutation structurelle des
  // jours (insert / remove / reorder / changement d'adresse). Comme les
  // segments sont keyés par numéro de jour et que la renumérotation réutilise
  // les mêmes numéros pour des étapes différentes, on purge tout le cache
  // touché. RouteRenderer recalculera via Directions API.
  const invalidateDirectionsCache = (rb: Roadbook): Roadbook => {
    return { ...rb, directions_segments: [] };
  };

  // Devine le type d'hébergement à partir du nom du lieu.
  const guessAccommodationType = (name: string): string => {
    const n = (name || "").toLowerCase();
    if (/lodge/.test(n)) return "Lodge";
    if (/camp(site|ground)?\b/.test(n)) return "Camp";
    if (/h[oô]tel|hotel/.test(n)) return "Hôtel";
    if (/guest\s?house|guesthouse|b&b|bnb/.test(n)) return "Guesthouse";
    if (/appart|apartment|appartement/.test(n)) return "Appartement";
    return "À définir";
  };

  // Décale une date YYYY-MM-DD de N jours. Renvoie "" si invalide.
  const shiftIsoDate = (iso: string, days: number): string => {
    if (!iso) return "";
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    d.setUTCDate(d.getUTCDate() + days);
    return d.toISOString().slice(0, 10);
  };

  // Ajouter une étape depuis un PlaceSelection (autocomplete ou recherche carte).
  // Sauvegarde IMMÉDIATE + auto-fill date / accommodation / distance / durée.
  const addDayFromPlace = async (place: PlaceSelection, position: number | null) => {
    const cur = rbRef.current;
    if (!cur) return;
    const list = cur.days || [];
    const insertIdx = position === null ? list.length : Math.max(0, Math.min(position, list.length));

    // 1. Date auto
    let newDate = "";
    if (insertIdx === 0) {
      newDate = cur.start_date || "";
    } else {
      const prev = list[insertIdx - 1];
      newDate = shiftIsoDate(prev?.date || cur.start_date || "", 1);
    }

    const accomType = guessAccommodationType(place.name);
    const newDay: Day = {
      ...emptyDay(insertIdx + 1),
      date: newDate,
      stage: place.name,
      accommodation: `Hébergement à ${place.name} - À choisir`,
      type: accomType,
      lat: place.lat ?? null,
      lng: place.lng ?? null,
    };

    // 2. Décale les dates des jours suivants de +1
    const after = list.slice(insertIdx).map((d) => ({
      ...d,
      date: shiftIsoDate(d.date, 1),
    }));

    const nextDays = renumberDays([
      ...list.slice(0, insertIdx),
      newDay,
      ...after,
    ]);
    const next = invalidateDirectionsCache({ ...cur, days: nextDays });
    setRb(next);

    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    dirtyRef.current = null;

    // Persiste la version "structurelle" tout de suite
    const { error } = await supabase
      .from("roadbooks")
      .update({ content: next as never })
      .eq("id", id);
    if (error) {
      toast.error("Échec de la sauvegarde : " + error.message);
      return;
    }
    toast.success("Étape ajoutée", { duration: 1500 });

    // 3. Calcul Directions pour les segments touchés (prev → new) et (new → next)
    const newDayIdx = insertIdx;
    const prevDay = newDayIdx > 0 ? nextDays[newDayIdx - 1] : null;
    const nextNeighbor = newDayIdx < nextDays.length - 1 ? nextDays[newDayIdx + 1] : null;
    const newDayPos = nextDays[newDayIdx];

    const newSegments: DirectionsSegment[] = [...(next.directions_segments || [])];
    let updatedDistance = 0;
    let updatedDuration = 0;
    let updatedNeighborDistance: number | null = null;
    let updatedNeighborDuration: number | null = null;

    const callDirections = async (
      from: Day,
      to: Day,
    ): Promise<DirectionsSegment | null> => {
      if (
        typeof from.lat !== "number" ||
        typeof from.lng !== "number" ||
        typeof to.lat !== "number" ||
        typeof to.lng !== "number"
      ) {
        return null;
      }
      try {
        const res = await getDirectionsSegment({
          data: {
            from: { lat: from.lat, lng: from.lng },
            to: { lat: to.lat, lng: to.lng },
          },
        });
        return {
          from_day: from.day,
          to_day: to.day,
          encoded_polyline: res.encoded_polyline,
          distance_meters: res.distance_meters,
          duration_seconds: res.duration_seconds,
          mode: res.ok ? "driving" : "fallback",
        };
      } catch (e) {
        console.warn("Directions auto-fill échoué:", e);
        return null;
      }
    };

    if (prevDay) {
      const seg = await callDirections(prevDay, newDayPos);
      if (seg) {
        newSegments.push(seg);
        if (seg.mode === "driving" && seg.distance_meters && seg.duration_seconds) {
          updatedDistance = Math.round(seg.distance_meters / 1000);
          updatedDuration = Math.round((seg.duration_seconds / 3600) * 10) / 10;
        }
      }
    }
    if (nextNeighbor) {
      const seg = await callDirections(newDayPos, nextNeighbor);
      if (seg) {
        newSegments.push(seg);
        if (seg.mode === "driving" && seg.distance_meters && seg.duration_seconds) {
          updatedNeighborDistance = Math.round(seg.distance_meters / 1000);
          updatedNeighborDuration =
            Math.round((seg.duration_seconds / 3600) * 10) / 10;
        }
      }
    }

    // 4. Met à jour distance/durée sur newDay et neighbor si calculés
    const finalDays = nextDays.map((d, i) => {
      if (i === newDayIdx && updatedDistance > 0) {
        return {
          ...d,
          distance_km: updatedDistance,
          drive_hours: updatedDuration,
        };
      }
      if (
        i === newDayIdx + 1 &&
        updatedNeighborDistance !== null &&
        updatedNeighborDistance > 0
      ) {
        return {
          ...d,
          distance_km: updatedNeighborDistance,
          drive_hours: updatedNeighborDuration ?? d.drive_hours,
        };
      }
      return d;
    });

    const final: Roadbook = {
      ...next,
      days: finalDays,
      directions_segments: newSegments,
    };
    setRb(final);
    await supabase
      .from("roadbooks")
      .update({ content: final as never })
      .eq("id", id);
  };


  // Suppression d'une étape — sauvegarde immédiate également.
  const removeDayByNumber = async (dayNumber: number) => {
    const cur = rbRef.current;
    if (!cur) return;
    const nextDays = renumberDays((cur.days || []).filter((d) => d.day !== dayNumber));
    const next = invalidateDirectionsCache({ ...cur, days: nextDays });
    setRb(next);
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    dirtyRef.current = null;
    const { error } = await supabase
      .from("roadbooks")
      .update({ content: next as never })
      .eq("id", id);
    if (error) {
      toast.error("Échec de la sauvegarde : " + error.message);
    } else {
      toast.success("Étape supprimée et enregistrée", { duration: 1500 });
    }
  };

  // Recalcul IA — régénère narratives, dates, transitions
  const runRecompute = async () => {
    setRecomputeOpen(false);
    setRecomputing(true);
    // Flush any pending auto-save
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    // Si une auto-save est en attente, persiste-la d'abord pour garantir
    // que la DB reflète les derniers ajouts.
    const pending = dirtyRef.current;
    dirtyRef.current = null;
    if (pending) {
      const { error: pendErr } = await supabase
        .from("roadbooks")
        .update({ content: pending as never })
        .eq("id", id);
      if (pendErr) {
        toast.error("Sauvegarde préalable échouée : " + pendErr.message);
        setRecomputing(false);
        return;
      }
    }

    try {
      // CAUSE A FIX — relire le roadbook le plus à jour depuis Supabase
      // pour s'assurer que tous les ajouts d'étapes sont bien présents
      // dans le payload envoyé à Claude.
      const { data: fresh, error: fetchErr } = await supabase
        .from("roadbooks")
        .select("content")
        .eq("id", id)
        .maybeSingle();
      if (fetchErr || !fresh?.content) {
        toast.error(
          "Impossible de relire le roadbook : " + (fetchErr?.message || "vide"),
        );
        setRecomputing(false);
        return;
      }
      const cur = fresh.content as unknown as Roadbook;
      const inputDaysCount = Array.isArray(cur.days) ? cur.days.length : 0;
      console.log(
        "[runRecompute] Envoi à Claude — days:",
        inputDaysCount,
        "stages:",
        (cur.days || []).map((d) => d.stage),
      );

      const res = await fetch("/api/recompute-roadbook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roadbook: cur,
          preserveModifiedNarratives: preserveModified,
        }),
      });
      const text = await res.text();
      if (!res.ok) {
        let msg = text;
        try {
          msg = JSON.parse(text).error || text;
        } catch {}
        toast.error("Échec du recalcul : " + msg.slice(0, 200));
        return;
      }
      const recomputed = JSON.parse(text) as Roadbook;
      const outputDaysCount = Array.isArray(recomputed.days)
        ? recomputed.days.length
        : 0;
      console.log(
        "[runRecompute] Réponse Claude — days:",
        outputDaysCount,
        "stages:",
        (recomputed.days || []).map((d) => d.stage),
      );

      // CAUSE B safety net — si Claude a perdu/dupliqué des étapes,
      // on refuse la réponse pour ne pas écraser les ajouts utilisateur.
      if (outputDaysCount !== inputDaysCount) {
        console.error(
          "[runRecompute] Mismatch days count — input:",
          inputDaysCount,
          "output:",
          outputDaysCount,
        );
        toast.error(
          `Recalcul rejeté : Claude a renvoyé ${outputDaysCount} jours au lieu de ${inputDaysCount}. Réessaye.`,
        );
        return;
      }

      // Préserve les coordonnées géocodées + stage/accommodation/type/lat/lng
      // des étapes existantes par index (filet de sécurité côté client).
      if (Array.isArray(recomputed.days) && Array.isArray(cur.days)) {
        recomputed.days = recomputed.days.map((d, i) => {
          const orig = cur.days[i];
          if (!orig) return d;
          const merged: Day = { ...d };
          // Préserve coords toujours
          if (typeof orig.lat === "number") merged.lat = orig.lat;
          if (typeof orig.lng === "number") merged.lng = orig.lng;
          // Préserve stage si Claude l'a vidé
          if (orig.stage && !d.stage) merged.stage = orig.stage;
          // Préserve accommodation si user-défini et non vide
          if (
            orig.accommodation &&
            !/^à définir$/i.test(orig.accommodation) &&
            (!d.accommodation || /^à définir$/i.test(d.accommodation))
          ) {
            merged.accommodation = orig.accommodation;
          }
          return merged;
        });
      }

      // Invalide le cache directions pour forcer recalcul carte
      recomputed.directions_segments = [];

      setRb(recomputed);
      const { error } = await supabase
        .from("roadbooks")
        .update({ content: recomputed as never })
        .eq("id", id);
      if (error) {
        toast.error("Sauvegarde échouée : " + error.message);
      } else {
        toast.success(`Roadbook recalculé (${outputDaysCount} jours)`);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error("Erreur : " + msg);
    } finally {
      setRecomputing(false);
    }
  };

  if (authLoading || loading || !rb) {
    return (
      <div className="grid min-h-screen place-items-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const handleExportPdf = async () => {
    const toastId = toast.loading("Génération du PDF en cours…");
    try {
      const [{ pdf }, { RoadbookPDF }] = await Promise.all([
        import("@react-pdf/renderer"),
        import("@/lib/pdf/RoadbookPDF"),
      ]);
      const slug = (s: string | undefined | null) =>
        (s || "voyage")
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-+|-+$/g, "");
      const content = { ...rb! };
      let coverImageUrl: string | null = null;
      try {
        const { fetchDestinationCover } = await import(
          "@/server/cover.functions"
        );
        const r = await fetchDestinationCover({
          data: { destination: content.destination || "" },
        });
        coverImageUrl = r.url;
      } catch (e) {
        console.warn("Cover fetch failed (PDF):", e);
      }
      const blob = await pdf(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        <RoadbookPDF
          roadbook={content as any}
          mapsApiKey={apiKey || undefined}
          coverImageUrl={coverImageUrl}
        />,
      ).toBlob();
      const filename = `Roadbook-${slug(content.client_name)}-${slug(content.destination)}.pdf`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast.success("PDF téléchargé", { id: toastId });
    } catch (e: unknown) {
      const err = e as { message?: string };
      console.error("PDF export failed", e);
      toast.error("Erreur génération PDF: " + (err?.message || "inconnue"), {
        id: toastId,
      });
    }
  };

  const totalDistance = (rb.days || []).reduce(
    (acc, d) => acc + (d.distance_km || 0),
    0,
  );
  const totalDriveHours = (rb.days || []).reduce(
    (acc, d) => acc + (d.drive_hours || 0),
    0,
  );
  const accommodationCount = (rb.accommodations_summary || []).length;

  const breadcrumb = (
    <BreadcrumbLine
      items={[
        { label: "Vos roadbooks", to: "/dashboard" },
        { label: rb.destination || "Roadbook" },
      ]}
    />
  );

  const topbarSlot = (
    <RoadbookTopbarActions
      status={status}
      onSetStatus={updateStatus}
      savingState={savingState}
      lastSavedAt={lastSavedAt}
      globalEdit={globalEdit}
      onToggleEdit={() => setGlobalEdit((v) => !v)}
      onRecompute={() => setRecomputeOpen(true)}
      onExportPdf={handleExportPdf}
    />
  );

  const content = (
    <AppShell breadcrumb={breadcrumb} topbarSlot={topbarSlot}>
      {/* Cover full-bleed */}
      <SectionErrorBoundary name="Couverture">
        <CoverSection
          cover={rb.cover}
          destination={rb.destination}
          theme={rb.theme}
          travelMode={rb.travel_mode}
          forceEdit={globalEdit}
          onSave={(cover) => persist({ ...rb, cover })}
          onAutoSave={(cover) => updateAndAutosave({ ...rb, cover })}
        />
      </SectionErrorBoundary>

      {/* Editorial body */}
      <RoadbookBody
        rb={rb}
        apiKey={apiKey}
        globalEdit={globalEdit}
        totalDistance={totalDistance}
        totalDriveHours={totalDriveHours}
        accommodationCount={accommodationCount}
        handleSegmentsChange={handleSegmentsChange}
        addDayFromPlace={addDayFromPlace}
        removeDayByNumber={removeDayByNumber}
        persist={persist}
        updateAndAutosave={updateAndAutosave}
      />

      {/* Footer */}
      <RoadbookFooter destination={rb.destination} />

      <Dialog open={recomputeOpen} onOpenChange={setRecomputeOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Recalculer le roadbook ?</DialogTitle>
            <DialogDescription className="pt-2">
              L'IA va régénérer les narratives, ajuster les dates et lisser les
              transitions à partir des étapes que tu as définies. Tes étapes
              (lieux, hébergements, types) seront préservées. Les narratives et
              conseils peuvent être réécrits.
            </DialogDescription>
          </DialogHeader>
          <label className="flex items-start gap-3 rounded-md border border-border bg-secondary/30 p-3 text-sm">
            <Checkbox
              checked={preserveModified}
              onCheckedChange={(v) => setPreserveModified(v === true)}
              className="mt-0.5"
            />
            <span className="text-foreground/85">
              Préserver les narratives que j'ai modifiées manuellement
            </span>
          </label>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRecomputeOpen(false)}
            >
              Annuler
            </Button>
            <Button onClick={runRecompute} className="gap-2">
              <Sparkles className="h-4 w-4" /> Recalculer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {recomputing && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-canvas/85 backdrop-blur-sm">
          <div className="flex max-w-sm flex-col items-center gap-4 rounded-2xl border border-border bg-surface px-10 py-10 text-center shadow-soft-lg">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <div>
              <p className="font-display text-xl font-semibold text-foreground">
                Recalcul en cours
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                L'IA ajuste les narratives, dates et transitions.
              </p>
              <p className="mt-2 text-xs text-text-soft">
                Durée estimée : 30 à 60 secondes.
              </p>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );

  if (!apiKey) return content;
  return (
    <APIProvider
      apiKey={apiKey}
      libraries={["places", "marker", "geometry"]}
    >
      {content}
    </APIProvider>
  );
}

/* ---------- Topbar actions ---------- */

function RoadbookTopbarActions({
  status,
  onSetStatus,
  savingState,
  lastSavedAt,
  globalEdit,
  onToggleEdit,
  onRecompute,
  onExportPdf,
}: {
  status: RoadbookStatus;
  onSetStatus: (s: RoadbookStatus) => void;
  savingState: "idle" | "saving";
  lastSavedAt: number | null;
  globalEdit: boolean;
  onToggleEdit: () => void;
  onRecompute: () => void;
  onExportPdf: () => void;
}) {
  return (
    <>
      <SaveIndicator state={savingState} lastSavedAt={lastSavedAt} />

      {/* Status pill — clickable */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className={cn(
              "status-pill transition-smooth hover:opacity-90",
              `status-${status}`,
            )}
            aria-label="Changer le statut"
          >
            {STATUS_LABEL[status]}
            <ChevronDown className="h-3 w-3 opacity-70" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          {(["draft", "ready", "delivered", "archived"] as const).map((s) => (
            <DropdownMenuItem
              key={s}
              onClick={() => onSetStatus(s)}
              className="text-[13px]"
            >
              <span className="flex-1">{STATUS_LABEL[s]}</span>
              {status === s && <Check className="h-3.5 w-3.5 text-primary" />}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <TooltipProvider delayDuration={250}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="sm"
              variant="outline"
              onClick={onRecompute}
              className="hidden h-9 gap-1.5 rounded-full border-border/70 bg-surface px-3.5 text-[12.5px] transition-smooth hover:border-primary/40 hover:bg-primary-soft hover:text-primary md:inline-flex"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Recalculer
            </Button>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">
            Régénère narratives, dates et transitions à partir de tes étapes.
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <Button
        size="sm"
        variant={globalEdit ? "default" : "outline"}
        onClick={onToggleEdit}
        className={
          globalEdit
            ? "h-9 gap-1.5 rounded-full px-3.5 text-[12.5px] transition-smooth"
            : "hidden h-9 gap-1.5 rounded-full border-border/70 bg-surface px-3.5 text-[12.5px] transition-smooth hover:border-primary/40 hover:bg-primary-soft hover:text-primary sm:inline-flex"
        }
      >
        <Pencil className="h-3.5 w-3.5" />
        {globalEdit ? "Quitter l'édition" : "Tout modifier"}
      </Button>

      <Button
        size="sm"
        onClick={onExportPdf}
        className="h-9 gap-1.5 rounded-full px-4 text-[12.5px] transition-smooth hover:scale-[1.02] hover:shadow-soft-md"
      >
        <Download className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Exporter en PDF</span>
        <span className="sm:hidden">PDF</span>
      </Button>
    </>
  );
}

function SaveIndicator({
  state,
  lastSavedAt,
}: {
  state: "idle" | "saving";
  lastSavedAt: number | null;
}) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const i = setInterval(() => setTick((t) => t + 1), 15_000);
    return () => clearInterval(i);
  }, []);
  // Reference tick so the elapsed string recomputes
  void tick;

  if (state === "saving") {
    return (
      <span className="hidden items-center gap-1.5 text-[12px] text-muted-foreground sm:inline-flex">
        <CloudUpload className="h-3.5 w-3.5 animate-pulse text-primary" />
        Enregistrement…
      </span>
    );
  }
  if (!lastSavedAt) return null;
  const seconds = Math.max(1, Math.round((Date.now() - lastSavedAt) / 1000));
  let label: string;
  if (seconds < 60) label = `il y a ${seconds}s`;
  else if (seconds < 3600) label = `il y a ${Math.round(seconds / 60)} min`;
  else label = "enregistré";
  return (
    <span className="hidden items-center gap-1.5 text-[12px] text-muted-foreground sm:inline-flex">
      <CloudCheck className="h-3.5 w-3.5 text-primary/70" />
      <span>Enregistré {label}</span>
    </span>
  );
}

/* ---------- Roadbook footer ---------- */

function RoadbookFooter({ destination }: { destination?: string }) {
  return (
    <footer className="border-t border-border/40 px-6 pb-16 pt-24 text-center sm:px-10">
      <span className="rule-warm" aria-hidden />
      <p className="mt-6 font-display text-[18px] italic text-foreground/70">
        Roadbook préparé sur Roadbook.ai
      </p>
      {destination && (
        <p className="mt-2 text-[12px] uppercase tracking-[0.24em] text-text-soft">
          {destination}
        </p>
      )}
    </footer>
  );
}

/* ---------- Section header ---------- */

function SectionHeader({
  label,
  editing,
  onEdit,
  onSave,
  onCancel,
  hideEditButton,
}: {
  label: string;
  editing: boolean;
  onEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
  hideEditButton?: boolean;
}) {
  return (
    <div className={`flex items-center justify-between ${label ? "mb-5" : "-mt-1 mb-3"}`}>
      {label ? (
        <h2 className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">
          {label}
        </h2>
      ) : (
        <span aria-hidden />
      )}
      {editing ? (
        hideEditButton ? null : (
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant="ghost"
              onClick={onCancel}
              className="gap-1.5 text-muted-foreground"
            >
              <X className="h-3.5 w-3.5" /> Annuler
            </Button>
            <Button size="sm" onClick={onSave} className="gap-1.5">
              <Check className="h-3.5 w-3.5" /> Enregistrer
            </Button>
          </div>
        )
      ) : (
        !hideEditButton && (
          <Button
            size="sm"
            variant="ghost"
            onClick={onEdit}
            className="gap-1.5 text-muted-foreground hover:text-primary"
          >
            <Pencil className="h-3.5 w-3.5" /> Modifier
          </Button>
        )
      )}
    </div>
  );
}

/* ---------- Roadbook Body (editorial sections wrapper) ---------- */

function RoadbookBody({
  rb,
  apiKey,
  globalEdit,
  totalDistance,
  totalDriveHours,
  accommodationCount,
  handleSegmentsChange,
  addDayFromPlace,
  removeDayByNumber,
  persist,
  updateAndAutosave,
}: {
  rb: Roadbook;
  apiKey: string | null;
  globalEdit: boolean;
  totalDistance: number;
  totalDriveHours: number;
  accommodationCount: number;
  handleSegmentsChange: (segs: DirectionsSegment[]) => void;
  addDayFromPlace: (place: PlaceSelection, position: number | null) => void;
  removeDayByNumber: (dayNumber: number) => void;
  persist: (next: Roadbook) => void;
  updateAndAutosave: (next: Roadbook) => void;
}) {
  const revealRef = useScrollReveal<HTMLDivElement>();

  return (
    <div ref={revealRef} className="mx-auto max-w-[880px] px-6 pb-32 pt-24 sm:px-10 sm:pt-32">
      {/* Vue d'ensemble */}
      <SectionErrorBoundary name="Vue d'ensemble">
        <section className="reveal" style={staggerStyle(0)}>
          <div className="mb-6 flex items-center gap-4">
            <span className="rule-warm" />
            <span className="eyebrow">Vue d'ensemble</span>
          </div>
          <EditableTextSection
            label=""
            value={rb?.overview ?? ""}
            forceEdit={globalEdit}
            onSave={(overview) => persist({ ...rb, overview })}
            onAutoSave={(overview) => updateAndAutosave({ ...rb, overview })}
            hideHeader
          />
        </section>
      </SectionErrorBoundary>

      {/* En bref — stats */}
      <SectionErrorBoundary name="En bref">
        <section className="reveal mt-24" style={staggerStyle(1)}>
          <div className="mb-6 flex items-center gap-4">
            <span className="rule-warm" />
            <span className="eyebrow">En bref</span>
          </div>
          <div className="grid grid-cols-2 gap-x-8 gap-y-6 sm:grid-cols-4">
            <StatCell
              label="Durée"
              value={
                rb?.duration_days
                  ? `${rb.duration_days} j`
                  : Array.isArray(rb?.days) && rb.days.length > 0
                    ? `${rb.days.length} j`
                    : "—"
              }
            />
            <StatCell
              label="Voyageurs"
              value={
                rb?.travelers
                  ? `${rb.travelers}${rb?.profile ? ` · ${rb.profile}` : ""}`
                  : rb?.profile || "—"
              }
            />
            <StatCell label="Modalité" value={rb?.travel_mode || "—"} />
            <StatCell
              label="Distance"
              value={totalDistance > 0 ? `${totalDistance} km` : "—"}
            />
          </div>
        </section>
      </SectionErrorBoundary>

      {/* Tracé du voyage */}
      <SectionErrorBoundary name="Tracé du voyage">
        <section className="reveal mt-32" style={staggerStyle(2)}>
          <div className="mb-6 flex items-center gap-4">
            <span className="rule-warm" />
            <span className="eyebrow">Tracé du voyage</span>
          </div>
          <h2 className="font-display mb-8 text-3xl font-semibold leading-tight text-foreground sm:text-[32px]">
            Vue d'ensemble de l'itinéraire
          </h2>
          <div className="overflow-hidden rounded-2xl shadow-soft-lg">
            {apiKey ? (
              <RoadbookMap
                days={Array.isArray(rb?.days) ? rb.days : []}
                segments={rb?.directions_segments ?? []}
                onSegmentsChange={handleSegmentsChange}
                regionBias={rb?.destination}
                onAddDay={addDayFromPlace}
                onRemoveDay={removeDayByNumber}
              />
            ) : (
              <div className="grid h-[450px] place-items-center bg-surface-warm text-sm text-muted-foreground">
                Chargement de la carte…
              </div>
            )}
          </div>
          <div className="mt-6 flex flex-wrap gap-x-8 gap-y-2 text-[13px] text-muted-foreground">
            <span>
              Distance totale&nbsp;:{" "}
              <span className="font-semibold text-foreground">
                {totalDistance} km
              </span>
            </span>
            <span>
              Route totale&nbsp;:{" "}
              <span className="font-semibold text-foreground">
                {(totalDriveHours ?? 0).toFixed(1)} h
              </span>
            </span>
            <span>
              Hébergements&nbsp;:{" "}
              <span className="font-semibold text-foreground">
                {accommodationCount}
              </span>
            </span>
          </div>
        </section>
      </SectionErrorBoundary>

      {/* Itinéraire */}
      <SectionErrorBoundary name="Itinéraire jour par jour">
        <section className="reveal mt-32" style={staggerStyle(3)}>
          <div className="mb-6 flex items-center gap-4">
            <span className="rule-warm" />
            <span className="eyebrow">Itinéraire jour par jour</span>
          </div>
          <DaysTableSection
            days={Array.isArray(rb?.days) ? rb.days : []}
            regionBias={rb?.destination}
            forceEdit={globalEdit}
            onSave={(days) => persist({ ...rb, days })}
            onAutoSave={(days) => updateAndAutosave({ ...rb, days })}
            onAddDayFromPlace={addDayFromPlace}
          />
        </section>
      </SectionErrorBoundary>

      {/* Hébergements */}
      <SectionErrorBoundary name="Hébergements">
        <section className="reveal mt-24" style={staggerStyle(4)}>
          <div className="mb-6 flex items-center gap-4">
            <span className="rule-warm" />
            <span className="eyebrow">Hébergements</span>
          </div>
          <AccommodationsSection
            items={Array.isArray(rb?.accommodations_summary) ? rb.accommodations_summary : []}
            regionBias={rb?.destination}
            forceEdit={globalEdit}
            onSave={(accommodations_summary) =>
              persist({ ...rb, accommodations_summary })
            }
            onAutoSave={(accommodations_summary) =>
              updateAndAutosave({ ...rb, accommodations_summary })
            }
          />
        </section>
      </SectionErrorBoundary>

      {/* Contacts */}
      <SectionErrorBoundary name="Contacts pratiques">
        <section className="reveal mt-24" style={staggerStyle(5)}>
          <div className="mb-6 flex items-center gap-4">
            <span className="rule-warm" />
            <span className="eyebrow">Contacts pratiques</span>
          </div>
          <ContactsSection
            contacts={Array.isArray(rb?.contacts) ? rb.contacts : []}
            regionBias={rb?.destination}
            forceEdit={globalEdit}
            onSave={(contacts) => persist({ ...rb, contacts })}
            onAutoSave={(contacts) => updateAndAutosave({ ...rb, contacts })}
          />
        </section>
      </SectionErrorBoundary>

      {/* Tips */}
      <SectionErrorBoundary name="Conseils & recommandations">
        <section className="reveal mt-24" style={staggerStyle(6)}>
          <div className="mb-6 flex items-center gap-4">
            <span className="rule-warm" />
            <span className="eyebrow">Conseils &amp; recommandations</span>
          </div>
          <TipsSection
            tips={Array.isArray(rb?.tips) ? rb.tips : []}
            forceEdit={globalEdit}
            onSave={(tips) => persist({ ...rb, tips })}
            onAutoSave={(tips) => updateAndAutosave({ ...rb, tips })}
          />
        </section>
      </SectionErrorBoundary>
    </div>
  );
}

function StatCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-b border-accent-warm/40 pb-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
        {label}
      </p>
      <p className="font-display mt-2 text-[26px] font-semibold leading-tight text-foreground">
        {value}
      </p>
    </div>
  );
}

/* ---------- Cover (full-bleed editorial) ---------- */

function CoverSection({
  cover,
  destination,
  theme,
  travelMode,
  forceEdit,
  onSave,
  onAutoSave,
}: {
  cover: Cover;
  destination?: string;
  theme?: string;
  travelMode?: string;
  forceEdit: boolean;
  onSave: (c: Cover) => void;
  onAutoSave: (c: Cover) => void;
}) {
  const [localEdit, setLocalEdit] = useState(false);
  const [draft, setDraft] = useState(cover);
  const [scrollY, setScrollY] = useState(0);
  const [hideHint, setHideHint] = useState(false);
  const editing = localEdit || forceEdit;
  const coverImage = useDestinationCover(destination);

  useEffect(() => {
    if (forceEdit) setDraft(cover);
  }, [forceEdit, cover]);

  // Subtle parallax: 0.4x scroll speed, only first 600px.
  useEffect(() => {
    if (editing) return;
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const y = Math.min(window.scrollY, 600);
        setScrollY(y);
        if (y > 40) setHideHint(true);
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, [editing]);

  const update = (patch: Partial<Cover>) => {
    const next = { ...draft, ...patch };
    setDraft(next);
    if (forceEdit) onAutoSave(next);
  };

  if (editing) {
    return (
      <div className="relative bg-primary px-8 py-20 text-white sm:px-14">
        {!forceEdit && (
          <div className="absolute right-6 top-6 flex items-center gap-1">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setDraft(cover);
                setLocalEdit(false);
              }}
              className="gap-1.5 text-white/90 hover:bg-white/15 hover:text-white"
            >
              <X className="h-3.5 w-3.5" /> Annuler
            </Button>
            <Button
              size="sm"
              onClick={() => {
                onSave(draft);
                setLocalEdit(false);
              }}
              className="gap-1.5 bg-white text-primary hover:bg-white/90"
            >
              <Check className="h-3.5 w-3.5" /> Enregistrer
            </Button>
          </div>
        )}
        <div className="mx-auto max-w-3xl space-y-3 pt-10">
          <Input
            value={draft.title}
            onChange={(e) => update({ title: e.target.value })}
            className="border-white/30 bg-white/15 text-2xl font-bold text-white placeholder:text-white/60"
          />
          <Input
            value={draft.subtitle}
            onChange={(e) => update({ subtitle: e.target.value })}
            className="border-white/30 bg-white/15 text-white placeholder:text-white/60"
          />
          <Input
            value={draft.tagline}
            onChange={(e) => update({ tagline: e.target.value })}
            className="border-white/30 bg-white/15 text-white placeholder:text-white/60"
          />
          <Input
            value={draft.dates_label}
            onChange={(e) => update({ dates_label: e.target.value })}
            className="border-white/30 bg-white/15 text-white placeholder:text-white/60"
          />
        </div>
      </div>
    );
  }

  return (
    <section
      className="relative isolate w-full overflow-hidden bg-primary text-white"
      style={{
        minHeight: "min(70vh, 640px)",
        height: "70vh",
      }}
    >
      {/* Parallax photo */}
      <div
        className="absolute inset-0 -z-20"
        style={{
          transform: `translate3d(0, ${scrollY * 0.4}px, 0)`,
          willChange: "transform",
        }}
      >
        {coverImage ? (
          <img
            src={coverImage}
            alt=""
            className="h-[120%] w-full object-cover"
          />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-primary via-primary to-primary-light" />
        )}
      </div>

      {/* Vertical overlay: dark top → teal bottom */}
      <div
        className="absolute inset-0 -z-10"
        style={{
          background:
            "linear-gradient(to bottom, rgba(0,0,0,0.20) 0%, rgba(15,110,86,0.05) 35%, rgba(15,110,86,0.45) 75%, rgba(15,110,86,0.72) 100%)",
        }}
      />

      {/* Edit button */}
      <button
        type="button"
        onClick={() => {
          setDraft(cover);
          setLocalEdit(true);
        }}
        className="absolute right-6 top-6 z-10 inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-white/10 px-4 py-2 text-[12px] font-medium text-white backdrop-blur-md transition-smooth hover:bg-white/20 sm:right-10"
      >
        <Pencil className="h-3.5 w-3.5" />
        Modifier
      </button>

      {/* Content — centered vertically at ~60% */}
      <div className="relative z-0 flex h-full w-full items-end justify-center pb-[28%] sm:pb-[22%]">
        <div className="mx-auto max-w-4xl px-6 text-center sm:px-10">
          <p className="eyebrow-light mb-6">Roadbook</p>
          <h1
            className="font-display font-bold leading-[0.95] text-white drop-shadow-[0_2px_30px_rgba(0,0,0,0.25)]"
            style={{
              fontSize: "clamp(56px, 8vw, 120px)",
              maxWidth: "16ch",
              margin: "0 auto",
            }}
          >
            {cover.title}
          </h1>
          {cover.subtitle && (
            <p className="font-display mx-auto mt-6 max-w-[600px] text-[20px] italic leading-snug text-white/95 sm:text-[24px]">
              {cover.subtitle}
            </p>
          )}
          {cover.tagline && (
            <p className="mx-auto mt-4 max-w-[560px] text-[14px] italic leading-relaxed text-white/80">
              {cover.tagline}
            </p>
          )}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
            {cover.dates_label && (
              <span className="inline-block rounded-full border border-white/25 bg-white/10 px-[18px] py-2 text-[13px] font-medium text-white backdrop-blur-md">
                {cover.dates_label}
              </span>
            )}
            {(theme || travelMode) && (
              <span className="inline-block rounded-full border border-white/25 bg-white/10 px-[18px] py-2 text-[10.5px] font-semibold uppercase tracking-[0.22em] text-white backdrop-blur-md">
                {[theme, travelMode].filter(Boolean).join(" · ")}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Scroll hint */}
      <div
        className={`pointer-events-none absolute bottom-8 left-1/2 z-10 -translate-x-1/2 text-white/70 transition-opacity duration-500 ${hideHint ? "opacity-0" : "opacity-100"}`}
      >
        <ChevronDown className="animate-scroll-hint h-5 w-5" strokeWidth={1.6} />
      </div>
    </section>
  );
}

/* ---------- Editable plain text ---------- */

function EditableTextSection({
  label,
  value,
  forceEdit,
  onSave,
  onAutoSave,
  hideHeader,
}: {
  label: string;
  value: string;
  forceEdit: boolean;
  onSave: (v: string) => void;
  onAutoSave: (v: string) => void;
  hideHeader?: boolean;
}) {
  const [localEdit, setLocalEdit] = useState(false);
  const [draft, setDraft] = useState(value);
  const editing = localEdit || forceEdit;

  useEffect(() => {
    if (forceEdit) setDraft(value);
  }, [forceEdit, value]);

  return (
    <section>
      {!hideHeader && (
        <SectionHeader
          label={label}
          editing={editing}
          hideEditButton={forceEdit}
          onEdit={() => {
            setDraft(value);
            setLocalEdit(true);
          }}
          onSave={() => {
            onSave(draft);
            setLocalEdit(false);
          }}
          onCancel={() => setLocalEdit(false)}
        />
      )}
      {hideHeader && !forceEdit && !localEdit && (
        <div className="mb-4 flex justify-end">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setDraft(value);
              setLocalEdit(true);
            }}
            className="gap-1.5 text-muted-foreground hover:text-primary"
          >
            <Pencil className="h-3.5 w-3.5" /> Modifier
          </Button>
        </div>
      )}
      {hideHeader && (localEdit || forceEdit) && !forceEdit && (
        <div className="mb-3 flex justify-end gap-1">
          <Button size="sm" variant="ghost" onClick={() => setLocalEdit(false)} className="gap-1.5 text-muted-foreground">
            <X className="h-3.5 w-3.5" /> Annuler
          </Button>
          <Button size="sm" onClick={() => { onSave(draft); setLocalEdit(false); }} className="gap-1.5">
            <Check className="h-3.5 w-3.5" /> Enregistrer
          </Button>
        </div>
      )}
      {editing ? (
        <Textarea
          rows={6}
          value={draft}
          onChange={(e) => {
            const v = e.target.value;
            setDraft(v);
            if (forceEdit) onAutoSave(v);
          }}
        />
      ) : (
        <p className="font-display max-w-[68ch] text-[18px] italic leading-[1.7] text-foreground/90">
          {value}
        </p>
      )}
    </section>
  );
}

/* ---------- Days table (drag-and-drop) ---------- */

interface DayRowProps {
  day: Day;
  index: number;
  editing: boolean;
  regionBias?: string;
  onUpdate: (patch: Partial<Day>) => void;
  onRemove: () => void;
  isOdd: boolean;
}

function DayRow({
  day,
  editing,
  regionBias,
  onUpdate,
  onRemove,
  isOdd,
}: DayRowProps) {
  const sortable = useSortable({ id: `day-${day.day}` });
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = sortable;

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };

  return (
    <Fragment>
      <tr
        ref={setNodeRef}
        style={style}
        className="border-t border-border/40"
      >
        {editing && (
          <td className="px-1 py-3 align-top">
            <button
              type="button"
              {...attributes}
              {...listeners}
              className="cursor-grab text-muted-foreground hover:text-primary active:cursor-grabbing"
              aria-label="Réordonner"
            >
              <GripVertical className="h-4 w-4" />
            </button>
          </td>
        )}
        <td className="px-3 py-3 font-semibold text-primary">J{day.day}</td>
        <td className="px-3 py-3 text-muted-foreground whitespace-nowrap">
          {editing ? (
            <Input
              value={day.date}
              onChange={(e) => onUpdate({ date: e.target.value })}
              className="h-8"
            />
          ) : (
            formatShortDate(day.date)
          )}
        </td>
        <td className="px-3 py-3 font-medium">
          {editing ? (
            <PlacesAutocompleteInput
              value={day.stage}
              onChange={(v) => onUpdate({ stage: v })}
              onSelect={(p) =>
                onUpdate({
                  stage: p.name,
                  lat: p.lat,
                  lng: p.lng,
                })
              }
              regionBias={regionBias}
              className="h-8"
            />
          ) : (
            day.stage
          )}
        </td>
        <td className="px-3 py-3">
          {editing ? (
            <PlacesAutocompleteInput
              value={day.accommodation}
              onChange={(v) => onUpdate({ accommodation: v })}
              onSelect={(p) =>
                onUpdate({
                  accommodation: p.name,
                  ...(typeof day.lat !== "number" && p.lat != null
                    ? { lat: p.lat, lng: p.lng }
                    : {}),
                })
              }
              regionBias={regionBias}
              types={["establishment"]}
              className="h-8"
            />
          ) : (
            day.accommodation
          )}
        </td>
        <td className="px-3 py-3 text-muted-foreground">
          {editing ? (
            <Input
              value={day.type}
              onChange={(e) => onUpdate({ type: e.target.value })}
              className="h-8"
            />
          ) : (
            day.type
          )}
        </td>
        <td className="px-3 py-3 text-muted-foreground">
          {editing ? (
            <Input
              value={day.flight}
              onChange={(e) => onUpdate({ flight: e.target.value })}
              className="h-8"
            />
          ) : (
            day.flight
          )}
        </td>
        <td className="px-3 py-3 text-right tabular-nums">
          {editing ? (
            <Input
              type="number"
              value={day.distance_km}
              onChange={(e) =>
                onUpdate({ distance_km: parseInt(e.target.value) || 0 })
              }
              className="h-8 w-20 ml-auto text-right"
            />
          ) : (
            <span>{day.distance_km} km</span>
          )}
        </td>
        <td className="px-3 py-3 text-right tabular-nums">
          {editing ? (
            <Input
              type="number"
              value={day.drive_hours}
              onChange={(e) =>
                onUpdate({ drive_hours: parseInt(e.target.value) || 0 })
              }
              className="h-8 w-16 ml-auto text-right"
            />
          ) : (
            <span>{day.drive_hours} h</span>
          )}
        </td>
        {editing && (
          <td className="px-2 py-3 align-top">
            <button
              type="button"
              onClick={onRemove}
              className="text-muted-foreground hover:text-destructive"
              aria-label="Supprimer ce jour"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </td>
        )}
      </tr>
      <tr className="border-t border-border/40">
        <td
          colSpan={editing ? 10 : 8}
          className="px-3 pb-4 pt-0 italic text-foreground/70"
        >
          {editing ? (
            <Textarea
              rows={2}
              value={day.narrative}
              onChange={(e) =>
                onUpdate({
                  narrative: e.target.value,
                  narrative_user_modified: true,
                })
              }
              className="italic"
            />
          ) : (
            day.narrative
          )}
        </td>
      </tr>
    </Fragment>
  );
}

function DaysTableSection({
  days,
  onSave,
  onAutoSave,
  regionBias,
  forceEdit,
  onAddDayFromPlace,
}: {
  days: Day[];
  onSave: (d: Day[]) => void;
  onAutoSave: (d: Day[]) => void;
  regionBias?: string;
  forceEdit: boolean;
  onAddDayFromPlace?: (place: PlaceSelection, position: number | null) => void;
}) {
  const [localEdit, setLocalEdit] = useState(false);
  const [draft, setDraft] = useState(days);
  const editing = localEdit || forceEdit;
  // Position où on est en train d'insérer un nouveau jour via autocomplete.
  // null = panneau fermé, "end" = ajout en fin, number = insertion à cet index.
  const [addingAt, setAddingAt] = useState<number | "end" | null>(null);

  // Resync local draft whenever the parent days prop changes. Évite la
  // divergence quand une étape est ajoutée/supprimée via la carte ou via
  // InsertRow pendant que la section est en mode édition locale (sinon le
  // bouton "Enregistrer" écraserait la mutation avec un draft obsolète).
  useEffect(() => {
    setDraft(days);
  }, [days]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  const list = editing ? draft : days;

  const update = (i: number, patch: Partial<Day>) => {
    const next = draft.map((day, idx) =>
      idx === i ? { ...day, ...patch } : day,
    );
    setDraft(next);
    if (forceEdit) onAutoSave(next);
  };

  const remove = (i: number) => {
    const next = renumberDays(draft.filter((_, idx) => idx !== i));
    setDraft(next);
    if (forceEdit) onAutoSave(next);
  };

  const add = () => {
    const next = renumberDays([...draft, emptyDay(draft.length + 1)]);
    setDraft(next);
    if (forceEdit) onAutoSave(next);
  };

  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIdx = draft.findIndex((d) => `day-${d.day}` === active.id);
    const newIdx = draft.findIndex((d) => `day-${d.day}` === over.id);
    if (oldIdx < 0 || newIdx < 0) return;
    const next = renumberDays(arrayMove(draft, oldIdx, newIdx));
    setDraft(next);
    if (forceEdit) onAutoSave(next);
  };

  const sortableIds = useMemo(
    () => list.map((d) => `day-${d.day}`),
    [list],
  );

  // Editorial vertical timeline (read mode only).
  if (!editing) {
    return (
      <section>
        <SectionHeader
          label=""
          editing={false}
          hideEditButton={false}
          onEdit={() => {
            setDraft(days);
            setLocalEdit(true);
          }}
          onSave={() => {}}
          onCancel={() => {}}
        />
        <ol className="relative space-y-6 border-l border-accent-warm/40 pl-8 sm:pl-10">
          {list.map((d, i) => (
            <li
              key={`day-card-${d.day}`}
              className="reveal relative"
              style={staggerStyle(i, 80)}
            >
              {/* Timeline dot */}
              <span
                aria-hidden
                className="absolute -left-[37px] top-6 grid h-4 w-4 place-items-center rounded-full bg-surface ring-1 ring-accent-warm/60 sm:-left-[45px]"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              </span>
              <article className="hover-lift overflow-hidden rounded-2xl border border-border/60 bg-surface shadow-soft">
                <div className="flex flex-col gap-6 p-7 sm:flex-row sm:items-start sm:gap-8">
                  <div className="flex-shrink-0 sm:w-[140px]">
                    <p className="text-[10.5px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                      Jour {d.day}
                    </p>
                    <p className="font-display mt-2 text-[28px] font-semibold leading-none text-foreground">
                      {d.date || "—"}
                    </p>
                    {d.type && (
                      <span className="status-pill mt-3 inline-block bg-accent-warm-soft text-foreground">
                        {d.type}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-display text-[22px] font-semibold leading-tight text-foreground sm:text-[26px]">
                      {d.stage || "Étape à définir"}
                    </h3>
                    {d.narrative && (
                      <p className="mt-3 max-w-[58ch] text-[15px] leading-relaxed text-muted-foreground">
                        {d.narrative}
                      </p>
                    )}
                    <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-[13px] text-muted-foreground">
                      {d.accommodation && (
                        <span className="inline-flex items-center gap-1.5">
                          {(() => {
                            const Icon = accommodationIcon(d.type);
                            return <Icon className="h-3.5 w-3.5 text-primary/70" />;
                          })()}
                          <span className="font-medium text-foreground">
                            {d.accommodation}
                          </span>
                        </span>
                      )}
                      {d.flight && (
                        <span className="inline-flex items-center gap-1.5">
                          <span className="text-foreground/60">✈</span>
                          {d.flight}
                        </span>
                      )}
                      {d.distance_km > 0 && (
                        <span className="inline-flex items-center gap-1.5">
                          <span className="text-foreground/60">→</span>
                          <span className="font-medium text-foreground">
                            {d.distance_km} km
                          </span>
                          {d.drive_hours > 0 && (
                            <span>· {d.drive_hours.toFixed(1)} h</span>
                          )}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </article>
            </li>
          ))}
        </ol>
      </section>
    );
  }

  return (
    <section>
      <SectionHeader
        label=""
        editing={editing}
        hideEditButton={forceEdit}
        onEdit={() => {
          setDraft(days);
          setLocalEdit(true);
        }}
        onSave={() => {
          onSave(renumberDays(draft));
          setLocalEdit(false);
        }}
        onCancel={() => setLocalEdit(false)}
      />

      <div className="overflow-hidden rounded-2xl border border-border/60 bg-surface shadow-soft">
        <table className="w-full text-sm">
          <thead className="border-b border-border/60 bg-surface-warm/60 text-left text-[10.5px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            <tr>
              {editing && <th className="px-1 py-3 w-6" />}
              <th className="px-3 py-3 w-12">Jour</th>
              <th className="px-3 py-3 w-20">Date</th>
              <th className="px-3 py-3">Étape</th>
              <th className="px-3 py-3">Hébergement</th>
              <th className="px-3 py-3 w-28" translate="no">
                Type
              </th>
              <th className="px-3 py-3">Vols / Transport</th>
              <th className="px-3 py-3 w-24 text-right">Distance</th>
              <th className="px-3 py-3 w-20 text-right" translate="no">
                Route
              </th>
              {editing && <th className="px-2 py-3 w-10" />}
            </tr>
          </thead>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={sortableIds}
              strategy={verticalListSortingStrategy}
            >
              <tbody>
                {list.map((d, i) => (
                  <Fragment key={`day-${d.day}`}>
                    <DayRow
                      day={d}
                      index={i}
                      editing={editing}
                      regionBias={regionBias}
                      onUpdate={(patch) => update(i, patch)}
                      onRemove={() => remove(i)}
                      isOdd={i % 2 === 1}
                    />
                    {editing &&
                      onAddDayFromPlace &&
                      addingAt === i + 1 && (
                        <InsertRow
                          label={
                            i + 1 >= list.length
                              ? "Ajouter une étape à la fin du voyage"
                              : `Insérer une étape entre J${d.day} et J${list[i + 1].day}`
                          }
                          regionBias={regionBias}
                          onCancel={() => setAddingAt(null)}
                          onSelect={(p) => {
                            if (p.lat == null || p.lng == null) {
                              toast.error("Lieu sans coordonnées, choisis-en un autre.");
                              return;
                            }
                            onAddDayFromPlace(p, i + 1);
                            setAddingAt(null);
                          }}
                        />
                      )}
                    {editing && onAddDayFromPlace && i < list.length - 1 && addingAt !== i + 1 && (
                      <tr>
                        <td colSpan={10} className="p-0">
                          <button
                            type="button"
                            onClick={() => setAddingAt(i + 1)}
                            className="group flex w-full items-center justify-center gap-1.5 py-1 text-[11px] font-medium text-muted-foreground/60 transition hover:bg-primary/5 hover:text-primary"
                          >
                            <Plus className="h-3 w-3" />
                            Insérer une étape entre J{d.day} et J{list[i + 1].day}
                          </button>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
                {editing && onAddDayFromPlace && addingAt === "end" && (
                  <InsertRow
                    label="Ajouter une étape à la fin du voyage"
                    regionBias={regionBias}
                    onCancel={() => setAddingAt(null)}
                    onSelect={(p) => {
                      if (p.lat == null || p.lng == null) {
                        toast.error("Lieu sans coordonnées, choisis-en un autre.");
                        return;
                      }
                      onAddDayFromPlace(p, null);
                      setAddingAt(null);
                    }}
                  />
                )}
              </tbody>
            </SortableContext>
          </DndContext>
        </table>
      </div>


      {editing && (
        <div className="mt-3 flex flex-wrap gap-2">
          {onAddDayFromPlace ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                setAddingAt(addingAt === "end" ? null : "end")
              }
              className="gap-2"
            >
              <Plus className="h-3.5 w-3.5" /> Ajouter un jour
            </Button>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={add}
              className="gap-2"
            >
              <Plus className="h-3.5 w-3.5" /> Ajouter un jour
            </Button>
          )}
        </div>
      )}
    </section>
  );
}

/* ---------- Insert row (inline autocomplete inside the days table) ---------- */

function InsertRow({
  label,
  regionBias,
  onCancel,
  onSelect,
}: {
  label: string;
  regionBias?: string;
  onCancel: () => void;
  onSelect: (p: PlaceSelection) => void;
}) {
  const [query, setQuery] = useState("");
  return (
    <tr className="bg-primary/5">
      <td colSpan={10} className="p-0">
        <div className="animate-in fade-in slide-in-from-top-1 duration-200 border-y-2 border-primary/40 px-4 py-3">
          <div className="mb-2 flex items-center justify-between">
            <div className="text-sm font-medium text-foreground">{label}</div>
            <button
              type="button"
              onClick={onCancel}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Annuler
            </button>
          </div>
          <PlacesAutocompleteInput
            value={query}
            onChange={setQuery}
            onSelect={onSelect}
            regionBias={regionBias}
            placeholder="Tape un lieu : Etosha National Park, Swakopmund…"
          />
          <p className="mt-2 text-xs text-muted-foreground">
            Sélectionne une suggestion : la nouvelle étape apparaîtra
            immédiatement sur la carte avec son tracé.
          </p>
        </div>
      </td>
    </tr>
  );
}

/* ---------- Accommodations ---------- */

function AccommodationsSection({
  items,
  onSave,
  onAutoSave,
  regionBias,
  forceEdit,
}: {
  items: AccommodationSummary[];
  onSave: (a: AccommodationSummary[]) => void;
  onAutoSave: (a: AccommodationSummary[]) => void;
  regionBias?: string;
  forceEdit: boolean;
}) {
  const [localEdit, setLocalEdit] = useState(false);
  const [draft, setDraft] = useState(items);
  const editing = localEdit || forceEdit;

  useEffect(() => {
    if (forceEdit) setDraft(items);
  }, [forceEdit, items]);

  const update = (i: number, patch: Partial<AccommodationSummary>) => {
    const next = draft.map((a, idx) => (idx === i ? { ...a, ...patch } : a));
    setDraft(next);
    if (forceEdit) onAutoSave(next);
  };
  const remove = (i: number) => {
    const next = draft.filter((_, idx) => idx !== i);
    setDraft(next);
    if (forceEdit) onAutoSave(next);
  };
  const add = () => {
    const next = [...draft, emptyAccommodation()];
    setDraft(next);
    if (forceEdit) onAutoSave(next);
  };

  const list = editing ? draft : items;

  return (
    <section>
      <SectionHeader
        label=""
        editing={editing}
        hideEditButton={forceEdit}
        onEdit={() => {
          setDraft(items);
          setLocalEdit(true);
        }}
        onSave={() => {
          onSave(draft);
          setLocalEdit(false);
        }}
        onCancel={() => setLocalEdit(false)}
      />

      <div className="overflow-hidden rounded-2xl border border-border/60 bg-surface shadow-soft">
        <table className="w-full text-sm">
          <thead className="border-b border-border/60 bg-surface-warm/60 text-left text-[10.5px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Lodge / Camp</th>
              <th className="px-4 py-3">Localisation</th>
              <th className="px-4 py-3" translate="no">
                Type
              </th>
              <th className="px-4 py-3 text-right w-20">Nuits</th>
              {editing && <th className="px-2 py-3 w-10" />}
            </tr>
          </thead>
          <tbody>
            {list.map((a, i) => (
              <tr key={i} className="border-t border-border/40">
                <td className="px-4 py-3 font-medium">
                  {editing ? (
                    <PlacesAutocompleteInput
                      value={a.name}
                      onChange={(v) => update(i, { name: v })}
                      onSelect={(p) =>
                        update(i, {
                          name: p.name,
                          ...(p.formatted && !a.location
                            ? { location: p.formatted }
                            : {}),
                        })
                      }
                      regionBias={regionBias}
                      types={["establishment"]}
                      className="h-8"
                    />
                  ) : (
                    a.name
                  )}
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {editing ? (
                    <PlacesAutocompleteInput
                      value={a.location}
                      onChange={(v) => update(i, { location: v })}
                      onSelect={(p) => update(i, { location: p.name })}
                      regionBias={regionBias}
                      className="h-8"
                    />
                  ) : (
                    a.location
                  )}
                </td>
                <td className="px-4 py-3 text-muted-foreground" translate="no">
                  {editing ? (
                    <Input
                      value={a.type}
                      onChange={(e) => update(i, { type: e.target.value })}
                      className="h-8"
                    />
                  ) : (
                    a.type
                  )}
                </td>
                <td className="px-4 py-3 text-right tabular-nums">
                  {editing ? (
                    <Input
                      type="number"
                      min={1}
                      value={a.nights}
                      onChange={(e) =>
                        update(i, { nights: parseInt(e.target.value) || 1 })
                      }
                      className="h-8 w-16 ml-auto text-right"
                    />
                  ) : (
                    a.nights
                  )}
                </td>
                {editing && (
                  <td className="px-2 py-3">
                    <button
                      type="button"
                      onClick={() => remove(i)}
                      className="text-muted-foreground hover:text-destructive"
                      aria-label="Supprimer cet hébergement"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={add}
          className="mt-3 gap-2"
        >
          <Plus className="h-3.5 w-3.5" /> Ajouter un hébergement
        </Button>
      )}
    </section>
  );
}

/* ---------- Contacts ---------- */

function ContactsSection({
  contacts,
  onSave,
  onAutoSave,
  regionBias,
  forceEdit,
}: {
  contacts: Contact[];
  onSave: (c: Contact[]) => void;
  onAutoSave: (c: Contact[]) => void;
  regionBias?: string;
  forceEdit: boolean;
}) {
  const [localEdit, setLocalEdit] = useState(false);
  const [draft, setDraft] = useState(contacts);
  const editing = localEdit || forceEdit;

  useEffect(() => {
    if (forceEdit) setDraft(contacts);
  }, [forceEdit, contacts]);

  const update = (i: number, patch: Partial<Contact>) => {
    const next = draft.map((c, idx) => (idx === i ? { ...c, ...patch } : c));
    setDraft(next);
    if (forceEdit) onAutoSave(next);
  };
  const remove = (i: number) => {
    const next = draft.filter((_, idx) => idx !== i);
    setDraft(next);
    if (forceEdit) onAutoSave(next);
  };
  const add = () => {
    const next = [...draft, emptyContact()];
    setDraft(next);
    if (forceEdit) onAutoSave(next);
  };

  const list = editing ? draft : contacts;

  return (
    <section>
      <SectionHeader
        label=""
        editing={editing}
        hideEditButton={forceEdit}
        onEdit={() => {
          setDraft(contacts);
          setLocalEdit(true);
        }}
        onSave={() => {
          onSave(draft);
          setLocalEdit(false);
        }}
        onCancel={() => setLocalEdit(false)}
      />

      <div className="overflow-hidden rounded-2xl border border-border/60 bg-surface shadow-soft">
        <table className="w-full text-sm">
          <thead className="border-b border-border/60 bg-surface-warm/60 text-left text-[10.5px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Rôle</th>
              <th className="px-4 py-3">Nom</th>
              <th className="px-4 py-3">Téléphone</th>
              <th className="px-4 py-3">Courriel</th>
              {editing && <th className="px-2 py-3 w-10" />}
            </tr>
          </thead>
          <tbody>
            {list.map((c, i) => (
              <tr key={i} className="border-t border-border/40">
                <td className="px-4 py-3 text-muted-foreground">
                  {editing ? (
                    <Input
                      value={c.role}
                      onChange={(e) => update(i, { role: e.target.value })}
                      className="h-8"
                    />
                  ) : (
                    c.role
                  )}
                </td>
                <td className="px-4 py-3 font-medium">
                  {editing ? (
                    <PlacesAutocompleteInput
                      value={c.name}
                      onChange={(v) => update(i, { name: v })}
                      onSelect={(p) => update(i, { name: p.name })}
                      regionBias={regionBias}
                      types={["establishment"]}
                      className="h-8"
                    />
                  ) : (
                    c.name
                  )}
                </td>
                <td className="px-4 py-3 tabular-nums">
                  {editing ? (
                    <Input
                      value={c.phone}
                      onChange={(e) => update(i, { phone: e.target.value })}
                      className="h-8"
                    />
                  ) : (
                    c.phone
                  )}
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {editing ? (
                    <Input
                      value={c.email ?? ""}
                      onChange={(e) => update(i, { email: e.target.value })}
                      className="h-8"
                    />
                  ) : (
                    c.email || "—"
                  )}
                </td>
                {editing && (
                  <td className="px-2 py-3">
                    <button
                      type="button"
                      onClick={() => remove(i)}
                      className="text-muted-foreground hover:text-destructive"
                      aria-label="Supprimer ce contact"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={add}
          className="mt-3 gap-2"
        >
          <Plus className="h-3.5 w-3.5" /> Ajouter un contact
        </Button>
      )}
    </section>
  );
}

/* ---------- Tips ---------- */

function TipsSection({
  tips,
  onSave,
  onAutoSave,
  forceEdit,
}: {
  tips: string[];
  onSave: (t: string[]) => void;
  onAutoSave: (t: string[]) => void;
  forceEdit: boolean;
}) {
  const [localEdit, setLocalEdit] = useState(false);
  const [draft, setDraft] = useState<string[]>(tips);
  const editing = localEdit || forceEdit;

  useEffect(() => {
    if (forceEdit) setDraft(tips);
  }, [forceEdit, tips]);

  const update = (i: number, v: string) => {
    const next = draft.map((t, idx) => (idx === i ? v : t));
    setDraft(next);
    if (forceEdit) onAutoSave(next.map((t) => t.trim()).filter(Boolean));
  };
  const remove = (i: number) => {
    const next = draft.filter((_, idx) => idx !== i);
    setDraft(next);
    if (forceEdit) onAutoSave(next.map((t) => t.trim()).filter(Boolean));
  };
  const add = () => {
    const next = [...draft, ""];
    setDraft(next);
  };

  return (
    <section>
      <SectionHeader
        label=""
        editing={editing}
        hideEditButton={forceEdit}
        onEdit={() => {
          setDraft(tips);
          setLocalEdit(true);
        }}
        onSave={() => {
          onSave(draft.map((t) => t.trim()).filter(Boolean));
          setLocalEdit(false);
        }}
        onCancel={() => setLocalEdit(false)}
      />

      {editing ? (
        <div className="space-y-2">
          {draft.map((t, i) => (
            <div key={i} className="flex items-start gap-2">
              <Lightbulb className="mt-2.5 h-4 w-4 shrink-0 text-primary" />
              <Textarea
                rows={2}
                value={t}
                onChange={(e) => update(i, e.target.value)}
                className="flex-1"
              />
              <button
                type="button"
                onClick={() => remove(i)}
                className="mt-2 text-muted-foreground hover:text-destructive"
                aria-label="Supprimer ce conseil"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={add}
            className="gap-2"
          >
            <Plus className="h-3.5 w-3.5" /> Ajouter un conseil
          </Button>
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {tips.map((t, i) => (
            <li
              key={i}
              className="flex gap-3 rounded-xl border border-border bg-surface p-5 transition-smooth hover:border-accent-warm/40 hover:shadow-[0_4px_12px_-4px_rgba(201,146,99,0.18)]"
            >
              <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-accent-warm-soft text-accent-warm">
                <Lightbulb className="h-3.5 w-3.5" strokeWidth={2} />
              </span>
              <span className="font-display text-[14.5px] italic leading-[1.7] text-foreground/85">
                {t}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
