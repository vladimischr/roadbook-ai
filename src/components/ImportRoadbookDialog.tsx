import { useCallback, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Upload, FileSpreadsheet, X, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const ACCEPTED = [".xlsx", ".xls", ".csv", ".tsv", ".ods"];
const ACCEPT_ATTR = ACCEPTED.join(",");
const MAX_BYTES = 5 * 1024 * 1024;

const STEPS = [
  "Lecture du fichier…",
  "Analyse par l'IA…",
  "Construction du roadbook…",
];

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
  return `${(bytes / 1024 / 1024).toFixed(2)} Mo`;
}

function isAccepted(name: string): boolean {
  const lower = name.toLowerCase();
  return ACCEPTED.some((ext) => lower.endsWith(ext));
}

export function ImportRoadbookDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [importing, setImporting] = useState(false);
  const [stepIdx, setStepIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setFile(null);
    setDragOver(false);
    setImporting(false);
    setStepIdx(0);
  };

  const handleClose = (next: boolean) => {
    if (!next && importing) return; // bloque la fermeture pendant l'import
    if (!next) reset();
    onOpenChange(next);
  };

  const handleFile = (f: File | null | undefined) => {
    if (!f) return;
    if (!isAccepted(f.name)) {
      toast.error("Format non supporté. Accepté : .xlsx, .xls, .csv, .tsv, .ods");
      return;
    }
    if (f.size > MAX_BYTES) {
      toast.error("Fichier trop volumineux (max 5 Mo).");
      return;
    }
    setFile(f);
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    handleFile(f);
  }, []);

  const runImport = async () => {
    if (!file) return;
    setImporting(true);
    setStepIdx(0);

    // Loader animé : passe d'étape toutes les 12s
    const interval = window.setInterval(() => {
      setStepIdx((i) => Math.min(i + 1, STEPS.length - 1));
    }, 12000);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) {
        toast.error("Session expirée. Reconnecte-toi.");
        setImporting(false);
        clearInterval(interval);
        return;
      }

      const fd = new FormData();
      fd.append("file", file);

      setStepIdx(1);
      const res = await fetch("/api/import-roadbook", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });

      clearInterval(interval);
      setStepIdx(2);

      const text = await res.text();
      if (!res.ok) {
        let errMsg = `Erreur ${res.status}`;
        try {
          const j = JSON.parse(text);
          errMsg = j.error || errMsg;
        } catch {
          errMsg = text.slice(0, 200) || errMsg;
        }
        toast.error("Import échoué : " + errMsg);
        setImporting(false);
        return;
      }

      const json = JSON.parse(text);
      if (!json?.id) {
        toast.error("Réponse invalide du serveur.");
        setImporting(false);
        return;
      }

      toast.success("Roadbook importé !");
      onOpenChange(false);
      reset();
      navigate({ to: "/roadbook/$id", params: { id: json.id } });
    } catch (e: any) {
      clearInterval(interval);
      toast.error("Import échoué : " + (e?.message || "erreur inconnue"));
      setImporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Importer un programme de voyage</DialogTitle>
          <DialogDescription>
            Glisse ton fichier Excel, CSV ou TSV. L'IA extrait automatiquement les
            étapes, dates et hébergements pour créer un roadbook éditable.
          </DialogDescription>
        </DialogHeader>

        {importing ? (
          <div className="flex flex-col items-center gap-4 py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <div className="space-y-2 text-center">
              {STEPS.map((s, i) => (
                <div
                  key={s}
                  className={
                    i === stepIdx
                      ? "text-sm font-medium text-foreground"
                      : i < stepIdx
                        ? "text-sm text-muted-foreground line-through"
                        : "text-sm text-muted-foreground/50"
                  }
                >
                  {s}
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Estimé : 30 à 60 secondes
            </p>
          </div>
        ) : !file ? (
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            className={`flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-10 transition ${
              dragOver
                ? "border-primary bg-primary/5"
                : "border-border bg-muted/30"
            }`}
          >
            <div className="grid h-12 w-12 place-items-center rounded-full bg-primary-soft">
              <Upload className="h-5 w-5 text-primary" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium">Glisse ton fichier ici</p>
              <p className="mt-1 text-xs text-muted-foreground">
                .xlsx, .xls, .csv, .tsv, .ods · 5 Mo max
              </p>
            </div>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => inputRef.current?.click()}
            >
              Sélectionner un fichier
            </Button>
            <input
              ref={inputRef}
              type="file"
              accept={ACCEPT_ATTR}
              className="hidden"
              onChange={(e) => handleFile(e.target.files?.[0])}
            />
          </div>
        ) : (
          <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-4">
            <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary-soft">
              <FileSpreadsheet className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{file.name}</p>
              <p className="text-xs text-muted-foreground">
                {formatSize(file.size)}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setFile(null)}
              className="rounded-md p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
              aria-label="Retirer le fichier"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {!importing && (
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => handleClose(false)}
              disabled={importing}
            >
              Annuler
            </Button>
            <Button onClick={runImport} disabled={!file || importing}>
              Importer
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
