import { useEffect, useState } from "react";
import { Download, Check, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  PDF_PALETTES,
  DEFAULT_PALETTE,
  suggestPaletteForDestination,
  type PdfPalette,
  type PdfPaletteId,
} from "@/lib/pdf/palettes";
import { cn } from "@/lib/utils";

const LAST_PALETTE_LS_KEY = "roadbook-ai:last-pdf-palette";

interface PdfExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Palette préselectionnée (ex. dernière utilisée sur ce roadbook). */
  defaultPaletteId?: PdfPaletteId;
  /**
   * Destination du roadbook — sert à l'auto-suggestion de palette.
   * Le caller passe `roadbook.destination` et on calcule la palette
   * suggérée selon des heuristiques (Maroc → Ocre, Tokyo → Minuit, etc).
   */
  destination?: string | null;
  /** Appelé quand le user clique "Télécharger" — reçoit la palette choisie. */
  onConfirm: (palette: PdfPalette) => Promise<void> | void;
  /**
   * État externe : si true, le bouton "Télécharger" affiche un spinner.
   * Permet de garder la modale ouverte pendant la génération.
   */
  generating?: boolean;
}

/**
 * Dialog qui s'ouvre avant l'export PDF pour laisser le travel designer
 * choisir une palette de couleurs. Les 6 palettes sont curated dans
 * `src/lib/pdf/palettes.ts`.
 *
 * Pattern UI : grille 2 colonnes (3 sur desktop) de cartes cliquables avec
 * 3 disques colorés (primary / primarySoft / ink) en aperçu rapide.
 */
export function PdfExportDialog({
  open,
  onOpenChange,
  defaultPaletteId,
  destination,
  onConfirm,
  generating = false,
}: PdfExportDialogProps) {
  // Auto-suggestion par destination (Maroc → Ocre, Tokyo → Minuit, etc).
  // Null si la destination ne matche aucun pattern → on tombe sur localStorage
  // ou EMERALD.
  const suggestedId = suggestPaletteForDestination(destination);

  // Priorité d'init :
  // 1. defaultPaletteId (prop explicite — futur stockage DB par-roadbook)
  // 2. suggestedId (heuristique destination)
  // 3. localStorage (dernière utilisée par ce designer)
  // 4. DEFAULT_PALETTE (Émeraude)
  const [selectedId, setSelectedId] = useState<PdfPaletteId>(() => {
    if (defaultPaletteId) return defaultPaletteId;
    if (suggestedId) return suggestedId;
    if (typeof window !== "undefined") {
      const stored = window.localStorage.getItem(LAST_PALETTE_LS_KEY);
      if (stored && PDF_PALETTES.some((p) => p.id === stored)) {
        return stored as PdfPaletteId;
      }
    }
    return DEFAULT_PALETTE.id;
  });

  // Si la prop defaultPaletteId change (ex. ouvre roadbook avec sa palette
  // stockée en DB), on resync.
  useEffect(() => {
    if (defaultPaletteId) setSelectedId(defaultPaletteId);
  }, [defaultPaletteId]);

  const selected =
    PDF_PALETTES.find((p) => p.id === selectedId) ?? DEFAULT_PALETTE;

  const handleConfirm = async () => {
    // Persiste avant l'export (au cas où le user ferme avant la fin).
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(LAST_PALETTE_LS_KEY, selected.id);
      } catch {
        // localStorage peut throw en mode privé Safari — silencieux.
      }
    }
    await onConfirm(selected);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-display text-[24px] font-semibold tracking-tight">
            Personnaliser le roadbook avant export
          </DialogTitle>
          <DialogDescription className="text-[13.5px] leading-relaxed text-muted-foreground">
            Choisis l'ambiance chromatique qui correspond au voyage. Les
            couleurs s'appliquent à la cover, aux titres de jour et aux
            bandeaux récapitulatifs.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {PDF_PALETTES.map((p) => {
            const isActive = p.id === selectedId;
            const isSuggested = p.id === suggestedId;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => setSelectedId(p.id)}
                disabled={generating}
                className={cn(
                  "group relative flex flex-col items-start gap-3 rounded-2xl border bg-surface p-4 text-left transition-smooth",
                  "hover:-translate-y-0.5 hover:shadow-soft-md",
                  isActive
                    ? "border-primary/60 shadow-soft-md ring-2 ring-primary/20"
                    : "border-border/60 shadow-soft",
                  generating && "pointer-events-none opacity-60",
                )}
                aria-pressed={isActive}
              >
                {isSuggested && !isActive && (
                  <span className="absolute -top-2 right-3 rounded-full bg-accent-warm px-2 py-0.5 text-[9.5px] font-semibold uppercase tracking-[0.12em] text-foreground shadow-soft">
                    Suggéré
                  </span>
                )}
                {/* Disques de couleurs — preview rapide */}
                <div className="flex items-center gap-1.5">
                  <span
                    className="h-7 w-7 rounded-full border border-black/5 shadow-inner"
                    style={{ backgroundColor: p.primary }}
                    aria-hidden
                  />
                  <span
                    className="h-7 w-7 rounded-full border border-black/5 shadow-inner"
                    style={{ backgroundColor: p.primarySoft }}
                    aria-hidden
                  />
                  <span
                    className="h-7 w-7 rounded-full border border-black/5 shadow-inner"
                    style={{ backgroundColor: p.ink }}
                    aria-hidden
                  />
                  {isActive && (
                    <span className="ml-auto inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground">
                      <Check className="h-3.5 w-3.5" />
                    </span>
                  )}
                </div>

                <div className="flex-1">
                  <p className="font-display text-[17px] font-semibold leading-tight text-foreground">
                    {p.name}
                  </p>
                  <p className="mt-1 text-[12.5px] leading-relaxed text-muted-foreground">
                    {p.tagline}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Mini-preview de la cover avec la palette sélectionnée */}
        <div className="mt-2 overflow-hidden rounded-xl border border-border/40">
          <div
            className="relative flex h-32 items-end justify-center px-5 pb-4"
            style={{ backgroundColor: selected.primary }}
          >
            <div className="text-center">
              <p
                className="text-[9px] font-semibold uppercase tracking-[0.32em]"
                style={{ color: selected.paper, opacity: 0.85 }}
              >
                Roadbook
              </p>
              <p
                className="font-display mt-1.5 text-[26px] font-semibold leading-none"
                style={{ color: selected.paper }}
              >
                Aperçu — {selected.name}
              </p>
              <p
                className="mt-1 text-[10.5px] italic"
                style={{ color: selected.paper, opacity: 0.85 }}
              >
                sept. 2026 · 7 jours
              </p>
            </div>
          </div>
        </div>

        <DialogFooter className="mt-4 gap-2">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={generating}
          >
            Annuler
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={generating}
            className="gap-2 rounded-full px-6"
          >
            {generating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Génération…
              </>
            ) : (
              <>
                <Download className="h-4 w-4" />
                Télécharger en PDF
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
