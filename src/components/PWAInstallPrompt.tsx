import { useEffect, useState } from "react";
import { Download, X, Share, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

// ============================================================================
// PWAInstallPrompt — incite le voyageur à installer le carnet sur son écran
// d'accueil. Branché sur /voyage/<token>.
// ============================================================================
// Comportement :
//   - Sur Android/Desktop : capture beforeinstallprompt → bouton "Installer"
//   - Sur iOS Safari : pas d'event natif → on affiche les instructions manuelles
//   - Si déjà installé (display-mode standalone) : on n'affiche rien
//   - Si l'utilisateur ferme : on ne ré-affiche pas pendant 7 jours (localStorage)

const DISMISS_KEY = "voyage-pwa-prompt-dismissed";
const DISMISS_DAYS = 7;

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function PWAInstallPrompt({ brand }: { brand?: string }) {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(
    null,
  );
  const [iosVisible, setIosVisible] = useState(false);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Si déjà installée, on ne fait rien
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      // iOS Safari
      (window.navigator as any).standalone === true;
    if (standalone) return;

    // Dismiss recent ?
    try {
      const dismissed = localStorage.getItem(DISMISS_KEY);
      if (dismissed) {
        const ms = Number(dismissed);
        if (
          !Number.isNaN(ms) &&
          Date.now() - ms < DISMISS_DAYS * 24 * 3600 * 1000
        )
          return;
      }
    } catch {
      // localStorage indisponible — on laisse afficher
    }

    // Detection iOS Safari
    const ua = window.navigator.userAgent.toLowerCase();
    const isIOS = /iphone|ipad|ipod/.test(ua) && !/crios|fxios/.test(ua);
    if (isIOS) {
      // Petit délai pour ne pas couvrir le contenu instantanément
      const t = setTimeout(() => setIosVisible(true), 4000);
      return () => clearTimeout(t);
    }

    // Android / Desktop : écouter beforeinstallprompt
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);

    const onInstalled = () => {
      setDeferred(null);
      setIosVisible(false);
    };
    window.addEventListener("appinstalled", onInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      /* noop */
    }
    setDeferred(null);
    setIosVisible(false);
    setShowIOSInstructions(false);
  };

  const install = async () => {
    if (!deferred) return;
    try {
      await deferred.prompt();
      const choice = await deferred.userChoice;
      if (choice.outcome === "accepted") {
        setDeferred(null);
      } else {
        dismiss();
      }
    } catch {
      dismiss();
    }
  };

  const accentColor = brand || "#0F6E56";

  if (!deferred && !iosVisible) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-md md:bottom-6">
      <div className="flex items-start gap-3 rounded-2xl border border-border/70 bg-surface/95 p-4 shadow-soft-lg backdrop-blur-md">
        <div
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-white"
          style={{ backgroundColor: accentColor }}
        >
          <Download className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[13.5px] font-medium text-foreground">
            Installer ce carnet
          </p>
          <p className="mt-0.5 text-[12px] leading-relaxed text-muted-foreground">
            Accédez à votre voyage hors ligne, comme une vraie app sur votre
            écran d'accueil.
          </p>

          {showIOSInstructions ? (
            <div className="mt-3 space-y-1.5 rounded-lg bg-muted/60 p-3 text-[12px] leading-relaxed text-foreground/85">
              <p className="flex items-center gap-1.5">
                <Share className="h-3.5 w-3.5 text-muted-foreground" />
                <span>
                  1. Touchez l'icône <strong>Partager</strong> en bas de Safari
                </span>
              </p>
              <p className="flex items-center gap-1.5">
                <Plus className="h-3.5 w-3.5 text-muted-foreground" />
                <span>
                  2. Choisissez <strong>"Sur l'écran d'accueil"</strong>
                </span>
              </p>
            </div>
          ) : (
            <div className="mt-3 flex gap-2">
              {deferred ? (
                <Button
                  size="sm"
                  onClick={install}
                  className="h-8 gap-1.5 rounded-full text-[12px]"
                  style={{ backgroundColor: accentColor, color: "white" }}
                >
                  <Download className="h-3 w-3" />
                  Installer
                </Button>
              ) : (
                <Button
                  size="sm"
                  onClick={() => setShowIOSInstructions(true)}
                  className="h-8 gap-1.5 rounded-full text-[12px]"
                  style={{ backgroundColor: accentColor, color: "white" }}
                >
                  Voir comment faire
                </Button>
              )}
              <Button
                size="sm"
                variant="ghost"
                onClick={dismiss}
                className="h-8 text-[12px] text-muted-foreground"
              >
                Plus tard
              </Button>
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Fermer"
          className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
