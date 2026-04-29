import { useEffect, useMemo, useRef, useState } from "react";
import { useMapsLibrary } from "@vis.gl/react-google-maps";
import { Input } from "@/components/ui/input";

export interface PlaceSelection {
  name: string;
  lat: number | null;
  lng: number | null;
  formatted?: string | null;
}

interface Props {
  value: string;
  onChange: (next: string) => void;
  /** Appelé quand l'utilisateur sélectionne une suggestion (avec lat/lng). */
  onSelect?: (place: PlaceSelection) => void;
  placeholder?: string;
  className?: string;
  /** Bias géographique sous forme de chaîne (ex: nom du pays). */
  regionBias?: string;
  /** "establishment" pour POIs/lodges, vide = lieux génériques. */
  types?: string[];
}

/**
 * Champ texte avec autocomplete Google Places (legacy AutocompleteService +
 * PlacesService.getDetails pour récupérer lat/lng). Reste un input contrôlé :
 * l'utilisateur peut taper du texte libre et soumettre sans choisir une
 * suggestion — dans ce cas onSelect n'est pas appelé.
 *
 * Doit être rendu DANS un <APIProvider> avec la lib "places" chargée.
 */
export function PlacesAutocompleteInput({
  value,
  onChange,
  onSelect,
  placeholder,
  className,
  regionBias,
  types,
}: Props) {
  const placesLib = useMapsLibrary("places");
  const [predictions, setPredictions] = useState<
    google.maps.places.AutocompletePrediction[]
  >([]);
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const sessionTokenRef = useRef<google.maps.places.AutocompleteSessionToken | null>(
    null,
  );
  const wrapperRef = useRef<HTMLDivElement>(null);

  const autocompleteService = useMemo(
    () => (placesLib ? new placesLib.AutocompleteService() : null),
    [placesLib],
  );
  const placesService = useMemo(() => {
    if (!placesLib) return null;
    // PlacesService a besoin d'un nœud DOM ou d'un Map ; un div détaché suffit.
    return new placesLib.PlacesService(document.createElement("div"));
  }, [placesLib]);

  // Init session token (utilisé pour billing en grappe)
  useEffect(() => {
    if (placesLib && !sessionTokenRef.current) {
      sessionTokenRef.current = new placesLib.AutocompleteSessionToken();
    }
  }, [placesLib]);

  // Click outside → fermeture
  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  // Fetch predictions when value changes
  useEffect(() => {
    if (!autocompleteService) return;
    const q = value.trim();
    if (q.length < 2) {
      setPredictions([]);
      return;
    }
    let cancelled = false;
    const handle = setTimeout(() => {
      autocompleteService.getPlacePredictions(
        {
          input: regionBias ? `${q} ${regionBias}` : q,
          sessionToken: sessionTokenRef.current ?? undefined,
          types: types && types.length ? types : undefined,
        },
        (res, status) => {
          if (cancelled) return;
          if (
            status !== google.maps.places.PlacesServiceStatus.OK ||
            !res
          ) {
            setPredictions([]);
            return;
          }
          setPredictions(res.slice(0, 5));
        },
      );
    }, 200);
    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [value, autocompleteService, regionBias, types]);

  const selectPrediction = (
    p: google.maps.places.AutocompletePrediction,
  ) => {
    setOpen(false);
    setActiveIdx(-1);
    if (!placesService) {
      onChange(p.description);
      return;
    }
    placesService.getDetails(
      {
        placeId: p.place_id,
        fields: ["name", "geometry.location", "formatted_address"],
        sessionToken: sessionTokenRef.current ?? undefined,
      },
      (place, status) => {
        if (
          status !== google.maps.places.PlacesServiceStatus.OK ||
          !place
        ) {
          onChange(p.description);
          return;
        }
        const name = place.name || p.structured_formatting?.main_text || p.description;
        onChange(name);
        onSelect?.({
          name,
          lat: place.geometry?.location?.lat() ?? null,
          lng: place.geometry?.location?.lng() ?? null,
          formatted: place.formatted_address ?? null,
        });
        // Renouveler le token après une selection
        if (placesLib) {
          sessionTokenRef.current = new placesLib.AutocompleteSessionToken();
        }
      },
    );
  };

  return (
    <div ref={wrapperRef} className="relative">
      <Input
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
          setActiveIdx(-1);
        }}
        onFocus={() => value && predictions.length > 0 && setOpen(true)}
        onKeyDown={(e) => {
          if (!open || predictions.length === 0) return;
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActiveIdx((i) => Math.min(i + 1, predictions.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActiveIdx((i) => Math.max(i - 1, 0));
          } else if (e.key === "Enter" && activeIdx >= 0) {
            e.preventDefault();
            selectPrediction(predictions[activeIdx]);
          } else if (e.key === "Escape") {
            setOpen(false);
          }
        }}
        placeholder={placeholder}
        className={className}
        autoComplete="off"
      />
      {open && predictions.length > 0 && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-md border border-border bg-popover shadow-md">
          {predictions.map((p, idx) => (
            <button
              key={p.place_id}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                selectPrediction(p);
              }}
              onMouseEnter={() => setActiveIdx(idx)}
              className={`block w-full truncate px-3 py-2 text-left text-sm transition-colors ${
                idx === activeIdx
                  ? "bg-accent text-accent-foreground"
                  : "hover:bg-accent/60"
              }`}
            >
              <span className="font-medium">
                {p.structured_formatting?.main_text ?? p.description}
              </span>
              {p.structured_formatting?.secondary_text && (
                <span className="ml-2 text-xs text-muted-foreground">
                  {p.structured_formatting.secondary_text}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
