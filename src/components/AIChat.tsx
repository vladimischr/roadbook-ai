import { useEffect, useRef, useState } from "react";
import {
  Send,
  Sparkles,
  Loader2,
  Undo2,
  X,
  Lightbulb,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// ============================================================================
// AIChat — Drawer flottant pour modifier un roadbook via conversation IA
// ============================================================================
// L'agent ouvre, tape une commande ("supprime le jour 3", "ajoute une
// journée à Walvis Bay"), l'IA applique. Snapshot du contenu avant chaque
// mutation pour permettre un Annuler immédiat.
//
// Coût : 1 crédit par envoi.

interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  /** Snapshot du roadbook AVANT la mutation associée — pour le rollback. */
  previousRoadbook?: unknown;
  timestamp: number;
}

const SUGGESTIONS = [
  "Supprime le jour 3",
  "Ajoute une journée à Walvis Bay",
  "Rends le rythme moins intense",
  "Remplace l'hébergement de J5 par un Airbnb",
  "Améliore la narrative du jour 7",
];

export function AIChat({
  open,
  onOpenChange,
  roadbookId,
  currentContent,
  onApplied,
  canUse,
  creditsRemaining,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  roadbookId: string;
  currentContent: unknown;
  /** Appelé après mutation IA réussie — le parent rafraîchit son state. */
  onApplied: (newContent: unknown) => void;
  /** False si plan free ou crédits épuisés — désactive l'envoi. */
  canUse: boolean;
  creditsRemaining: number | null;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll vers le bas à chaque nouveau message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const send = async (commandText: string) => {
    if (!commandText.trim() || sending) return;
    if (!canUse) {
      toast.error("Crédits épuisés ou plan trop bas");
      return;
    }

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: "user",
      content: commandText.trim(),
      timestamp: Date.now(),
    };
    setMessages((m) => [...m, userMsg]);
    setInput("");
    setSending(true);

    // Snapshot AVANT mutation pour le rollback
    const previousSnapshot = currentContent;

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) {
        throw new Error("Session expirée");
      }

      const res = await fetch("/api/chat-roadbook", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          roadbook_id: roadbookId,
          command: commandText.trim(),
        }),
      });

      const text = await res.text();
      let parsed: any = null;
      try {
        parsed = JSON.parse(text);
      } catch {}

      if (!res.ok) {
        const errMsg = parsed?.error || `HTTP ${res.status}`;
        const errMsgFull =
          res.status === 402
            ? errMsg + " (clique sur Mon abonnement pour passer Pro)"
            : errMsg;
        setMessages((m) => [
          ...m,
          {
            id: `e-${Date.now()}`,
            role: "system",
            content: "❌ " + errMsgFull,
            timestamp: Date.now(),
          },
        ]);
        return;
      }

      const summary = parsed?.summary || "Modification appliquée.";
      const newContent = parsed?.roadbook;
      if (!newContent) {
        throw new Error("Réponse invalide (pas de roadbook)");
      }

      setMessages((m) => [
        ...m,
        {
          id: `a-${Date.now()}`,
          role: "assistant",
          content: summary,
          previousRoadbook: previousSnapshot,
          timestamp: Date.now(),
        },
      ]);

      // Applique le nouveau contenu côté parent
      onApplied(newContent);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setMessages((m) => [
        ...m,
        {
          id: `e-${Date.now()}`,
          role: "system",
          content: "❌ " + msg,
          timestamp: Date.now(),
        },
      ]);
    } finally {
      setSending(false);
    }
  };

  const handleUndo = (msg: ChatMessage) => {
    if (!msg.previousRoadbook) return;
    onApplied(msg.previousRoadbook);
    setMessages((m) => [
      ...m,
      {
        id: `u-${Date.now()}`,
        role: "system",
        content: "↩️ Modification annulée.",
        timestamp: Date.now(),
      },
    ]);
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    send(input);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col p-0 sm:max-w-md"
      >
        <SheetHeader className="border-b border-border/40 px-6 pb-4 pt-5 text-left">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <SheetTitle className="font-display text-[20px] font-semibold">
              Modifier avec l'IA
            </SheetTitle>
          </div>
          <SheetDescription className="text-[12.5px]">
            Demande à l'IA d'ajouter, supprimer ou retoucher des étapes en
            langage naturel. 1 crédit par demande.
            {creditsRemaining !== null && (
              <span className="ml-1 font-medium text-foreground">
                ({creditsRemaining} crédit{creditsRemaining > 1 ? "s" : ""}{" "}
                restant{creditsRemaining > 1 ? "s" : ""})
              </span>
            )}
          </SheetDescription>
        </SheetHeader>

        {/* Zone messages */}
        <div className="flex-1 overflow-y-auto px-5 py-5">
          {messages.length === 0 ? (
            <div className="space-y-4">
              <div className="rounded-xl border border-border/40 bg-surface-warm/40 p-4">
                <div className="flex items-start gap-2.5">
                  <Lightbulb className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-accent-warm" />
                  <p className="text-[12.5px] leading-relaxed text-foreground/80">
                    Tape une instruction en langage naturel — l'IA modifie le
                    roadbook directement. Tu peux annuler la dernière
                    modification à tout moment.
                  </p>
                </div>
              </div>

              <div>
                <p className="mb-2 text-[10.5px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Suggestions
                </p>
                <div className="space-y-2">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => send(s)}
                      disabled={sending || !canUse}
                      className="block w-full rounded-lg border border-border/60 bg-surface px-3 py-2 text-left text-[13px] text-foreground/85 transition hover:border-primary/40 hover:bg-primary-soft/40 hover:text-primary disabled:opacity-50"
                    >
                      « {s} »
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {messages.map((m) => (
                <ChatBubble
                  key={m.id}
                  message={m}
                  onUndo={() => handleUndo(m)}
                />
              ))}
              {sending && (
                <div className="flex items-center gap-2 rounded-xl bg-primary-soft/40 px-3.5 py-2.5 text-[13px] text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                  L'IA réfléchit…
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input */}
        <form
          onSubmit={onSubmit}
          className="border-t border-border/40 bg-background px-5 py-4"
        >
          <div className="flex items-end gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send(input);
                }
              }}
              placeholder={
                canUse
                  ? "Décris ta modification…"
                  : "Crédits épuisés"
              }
              rows={2}
              disabled={!canUse || sending}
              className="flex-1 resize-none rounded-md border border-border bg-background px-3 py-2 text-[13.5px] outline-none transition focus:border-primary/50 focus:ring-2 focus:ring-primary/15 disabled:opacity-50"
            />
            <Button
              type="submit"
              disabled={!input.trim() || sending || !canUse}
              size="icon"
              className="h-9 w-9 rounded-md"
              aria-label="Envoyer"
            >
              {sending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
          <p className="mt-2 text-[10.5px] text-text-soft">
            ⌘+Entrée pour envoyer · Maj+Entrée pour passer à la ligne
          </p>
        </form>
      </SheetContent>
    </Sheet>
  );
}

function ChatBubble({
  message,
  onUndo,
}: {
  message: ChatMessage;
  onUndo: () => void;
}) {
  if (message.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-primary px-3.5 py-2.5 text-[13px] text-primary-foreground">
          {message.content}
        </div>
      </div>
    );
  }
  if (message.role === "system") {
    return (
      <div className="text-center text-[12px] text-muted-foreground">
        {message.content}
      </div>
    );
  }
  // assistant
  const canUndo = !!message.previousRoadbook;
  return (
    <div className="flex flex-col gap-1.5">
      <div className="max-w-[90%] rounded-2xl rounded-bl-sm border border-border/60 bg-surface px-3.5 py-2.5 text-[13px] leading-relaxed text-foreground/90 shadow-soft">
        <span className="mr-1.5 inline-flex h-3.5 w-3.5 items-center justify-center rounded-full bg-primary-soft text-primary">
          <Sparkles className="h-2.5 w-2.5" />
        </span>
        {message.content}
      </div>
      {canUndo && (
        <button
          type="button"
          onClick={onUndo}
          className="ml-2 inline-flex w-fit items-center gap-1 text-[11.5px] font-medium text-muted-foreground hover:text-destructive"
        >
          <Undo2 className="h-3 w-3" />
          Annuler cette modification
        </button>
      )}
    </div>
  );
}
