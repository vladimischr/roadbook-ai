import { useEffect, useState, useRef } from "react";
import { Loader2, Search, Upload, X, Check } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// ============================================================================
// PhotoPicker — modale à deux onglets pour ajouter une photo à une étape
// ============================================================================
// - Onglet "Banque d'images" : recherche Pexels (12 résultats par requête)
// - Onglet "Importer" : upload depuis l'ordinateur de l'agent vers Supabase
//   Storage (bucket `roadbook-photos`)
//
// La photo retournée a la forme :
//   { url, source: "pexels"|"upload", credit?, alt? }
//
// L'agent peut sélectionner et confirmer plusieurs photos d'un coup.

export interface PhotoEntry {
  url: string;
  source: "pexels" | "upload";
  credit?: string;
  credit_url?: string;
  alt?: string;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic"];

interface PexelsResult {
  id: number;
  url_large: string;
  url_medium: string;
  url_small: string;
  url_landscape: string;
  alt: string;
  photographer: string;
  credit_url: string;
}

export function PhotoPicker({
  open,
  onOpenChange,
  defaultQuery = "",
  roadbookId,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  /** Pré-remplit la recherche Pexels (typiquement le stage du jour). */
  defaultQuery?: string;
  /** Utilisé pour structurer le path de stockage des uploads. */
  roadbookId: string;
  /** Appelé avec les photos sélectionnées (1+) à la confirmation. */
  onConfirm: (photos: PhotoEntry[]) => void;
}) {
  const [tab, setTab] = useState<"search" | "upload">("search");
  const [query, setQuery] = useState(defaultQuery);
  const [searchLoading, setSearchLoading] = useState(false);
  const [results, setResults] = useState<PexelsResult[]>([]);
  const [selectedPexels, setSelectedPexels] = useState<Set<number>>(new Set());

  const [uploads, setUploads] = useState<PhotoEntry[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset au open/close
  useEffect(() => {
    if (open) {
      setQuery(defaultQuery);
      setResults([]);
      setSelectedPexels(new Set());
      setUploads([]);
      setTab("search");
      // Auto-search si on a une query par défaut
      if (defaultQuery) runSearch(defaultQuery);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, defaultQuery]);

  const runSearch = async (q: string) => {
    if (!q.trim()) return;
    setSearchLoading(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) {
        toast.error("Session expirée");
        return;
      }
      const res = await fetch(
        `/api/pexels-search?q=${encodeURIComponent(q)}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      if (!res.ok) {
        toast.error("Recherche photos indisponible");
        return;
      }
      const data = (await res.json()) as { photos: PexelsResult[] };
      setResults(data.photos || []);
      if ((data.photos || []).length === 0) {
        toast.info(`Aucun résultat pour « ${q} »`);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error("Recherche échouée : " + msg);
    } finally {
      setSearchLoading(false);
    }
  };

  const togglePexels = (id: number) => {
    setSelectedPexels((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      toast.error("Connexion requise");
      setUploading(false);
      return;
    }

    const newEntries: PhotoEntry[] = [];

    for (const file of Array.from(files)) {
      if (!ACCEPTED_TYPES.includes(file.type) && !file.name.match(/\.heic$/i)) {
        toast.error(`Format non supporté : ${file.name}`);
        continue;
      }
      if (file.size > MAX_FILE_SIZE) {
        toast.error(
          `${file.name} trop volumineux (max ${MAX_FILE_SIZE / 1024 / 1024} Mo)`,
        );
        continue;
      }

      // Path : {user_id}/{roadbook_id}/{timestamp}-{name}
      // (timestamp évite les collisions si même fichier réuploaded)
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const safeName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const path = `${user.id}/${roadbookId}/${safeName}`;

      const { error: uploadErr } = await supabase.storage
        .from("roadbook-photos")
        .upload(path, file, {
          cacheControl: "31536000",
          upsert: false,
        });
      if (uploadErr) {
        console.error("[upload] error:", uploadErr);
        toast.error("Échec upload " + file.name + " : " + uploadErr.message);
        continue;
      }

      const { data: pub } = supabase.storage
        .from("roadbook-photos")
        .getPublicUrl(path);
      newEntries.push({
        url: pub.publicUrl,
        source: "upload",
        alt: file.name.replace(/\.[^.]+$/, ""),
      });
    }

    setUploads((prev) => [...prev, ...newEntries]);
    setUploading(false);
    if (newEntries.length > 0) {
      toast.success(
        `${newEntries.length} photo${newEntries.length > 1 ? "s" : ""} importée${newEntries.length > 1 ? "s" : ""}`,
      );
    }
  };

  const removeUpload = (index: number) => {
    setUploads((prev) => prev.filter((_, i) => i !== index));
  };

  const totalSelected = selectedPexels.size + uploads.length;

  const handleConfirm = () => {
    const photos: PhotoEntry[] = [];

    // Photos Pexels sélectionnées
    for (const r of results) {
      if (selectedPexels.has(r.id)) {
        photos.push({
          url: r.url_large,
          source: "pexels",
          credit: `${r.photographer} / Pexels`,
          credit_url: r.credit_url,
          alt: r.alt,
        });
      }
    }
    // Uploads
    photos.push(...uploads);

    if (photos.length === 0) {
      toast.info("Sélectionne au moins une photo");
      return;
    }

    onConfirm(photos);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Ajouter des photos</DialogTitle>
          <DialogDescription>
            Choisissez dans la banque Pexels ou importez vos propres photos.
          </DialogDescription>
        </DialogHeader>

        {/* Tabs */}
        <div className="flex border-b border-border/60">
          <button
            type="button"
            onClick={() => setTab("search")}
            className={cn(
              "flex-1 border-b-2 pb-2.5 pt-1 text-[13px] font-medium transition",
              tab === "search"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            Banque d'images
          </button>
          <button
            type="button"
            onClick={() => setTab("upload")}
            className={cn(
              "flex-1 border-b-2 pb-2.5 pt-1 text-[13px] font-medium transition",
              tab === "upload"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            Importer mes photos
          </button>
        </div>

        {tab === "search" ? (
          <div className="space-y-3">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                runSearch(query);
              }}
              className="flex gap-2"
            >
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Sossusvlei, Etosha, Kyoto…"
                  className="pl-9"
                />
              </div>
              <Button type="submit" disabled={searchLoading || !query.trim()}>
                {searchLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Chercher"
                )}
              </Button>
            </form>

            <div className="max-h-[420px] overflow-y-auto">
              {searchLoading ? (
                <div className="grid place-items-center py-16">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : results.length === 0 ? (
                <div className="grid place-items-center py-16 text-center">
                  <p className="text-[13px] text-muted-foreground">
                    {query
                      ? "Aucun résultat. Essayez un autre mot-clé."
                      : "Tapez un lieu pour chercher des photos."}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {results.map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => togglePexels(r.id)}
                      className={cn(
                        "group relative aspect-[4/3] overflow-hidden rounded-lg border-2 transition",
                        selectedPexels.has(r.id)
                          ? "border-primary"
                          : "border-transparent hover:border-primary/40",
                      )}
                    >
                      <img
                        src={r.url_small}
                        alt={r.alt}
                        loading="lazy"
                        className="h-full w-full object-cover"
                      />
                      {selectedPexels.has(r.id) && (
                        <span className="absolute right-1.5 top-1.5 grid h-5 w-5 place-items-center rounded-full bg-primary text-primary-foreground">
                          <Check className="h-3 w-3" strokeWidth={3} />
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground">
              Crédit photographe automatiquement enregistré (obligation
              Pexels).
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept={ACCEPTED_TYPES.join(",") + ",.heic"}
              onChange={(e) => handleFiles(e.target.files)}
              className="hidden"
            />
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                handleFiles(e.dataTransfer.files);
              }}
              className="flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-border bg-muted/30 p-10"
            >
              <div className="grid h-12 w-12 place-items-center rounded-full bg-primary-soft">
                {uploading ? (
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                ) : (
                  <Upload className="h-5 w-5 text-primary" />
                )}
              </div>
              <div className="text-center">
                <p className="text-sm font-medium">
                  {uploading
                    ? "Import en cours…"
                    : "Glisse tes photos ici"}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  JPG, PNG, WebP, HEIC · 10 Mo max par photo
                </p>
              </div>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                Sélectionner des fichiers
              </Button>
            </div>

            {uploads.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {uploads.map((u, i) => (
                  <div
                    key={i}
                    className="group relative aspect-[4/3] overflow-hidden rounded-lg border border-border"
                  >
                    <img
                      src={u.url}
                      alt={u.alt || ""}
                      className="h-full w-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => removeUpload(i)}
                      className="absolute right-1.5 top-1.5 grid h-6 w-6 place-items-center rounded-full bg-foreground/80 text-background opacity-0 transition group-hover:opacity-100"
                      aria-label="Retirer cette photo"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="flex items-center justify-between border-t border-border/40 pt-4">
          <p className="text-[13px] text-muted-foreground">
            {totalSelected > 0
              ? `${totalSelected} photo${totalSelected > 1 ? "s" : ""} sélectionnée${totalSelected > 1 ? "s" : ""}`
              : "Aucune photo sélectionnée"}
          </p>
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button onClick={handleConfirm} disabled={totalSelected === 0}>
              Ajouter {totalSelected > 0 ? `(${totalSelected})` : ""}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
