import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Lock, Eye, EyeOff, ArrowRight, CheckCircle2 } from "lucide-react";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { updatePassword } from "@/lib/auth";
import { toast } from "sonner";

// ============================================================================
// /reset-password — page atteinte via le lien email de réinitialisation
// ============================================================================
// Quand un user clique le lien envoyé par sendPasswordReset, Supabase
// échange le token contre une session active automatiquement (côté client
// JS). À ce stade, l'utilisateur EST connecté temporairement et peut
// changer son mot de passe via supabase.auth.updateUser({ password }).

export const Route = createFileRoute("/reset-password")({
  component: ResetPassword,
  head: () => ({
    meta: [{ title: "Réinitialiser le mot de passe — Roadbook.ai" }],
  }),
});

function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (done) {
      const t = setTimeout(() => navigate({ to: "/dashboard" }), 2000);
      return () => clearTimeout(t);
    }
  }, [done, navigate]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      toast.error("Mot de passe trop court (8 caractères minimum)");
      return;
    }
    if (password !== confirm) {
      toast.error("Les mots de passe ne correspondent pas");
      return;
    }
    setSubmitting(true);
    const { error } = await updatePassword(password);
    setSubmitting(false);
    if (error) {
      toast.error(
        "Échec : " +
          error.message +
          ". Le lien a peut-être expiré — redemande-en un.",
      );
      return;
    }
    setDone(true);
    toast.success("Mot de passe modifié");
  };

  if (done) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <header className="border-b border-border/60">
          <div className="container-editorial flex items-center px-6 py-4 sm:px-10">
            <Logo />
          </div>
        </header>
        <main className="flex flex-1 items-center justify-center px-6 py-12">
          <div className="w-full max-w-md">
            <div className="rounded-2xl border border-border bg-card p-8 text-center shadow-soft-md">
              <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-primary-soft">
                <CheckCircle2 className="h-6 w-6 text-primary" />
              </div>
              <h1 className="font-display mt-6 text-[24px] font-semibold leading-tight">
                Mot de passe mis à jour
              </h1>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                Redirection vers votre tableau de bord…
              </p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="border-b border-border/60">
        <div className="container-editorial flex items-center px-6 py-4 sm:px-10">
          <Logo />
        </div>
      </header>
      <main className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <div className="rounded-2xl border border-border bg-card p-8 shadow-soft-md sm:p-10">
            <div className="flex items-center gap-3">
              <span className="rule-warm" aria-hidden />
              <span className="eyebrow">Nouveau mot de passe</span>
            </div>
            <h1 className="font-display mt-5 text-[26px] font-semibold leading-tight tracking-tight text-foreground">
              Définir un nouveau mot de passe
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Choisissez un mot de passe d'au moins 8 caractères.
            </p>

            <form onSubmit={onSubmit} className="mt-6 space-y-4">
              <div>
                <label className="text-sm font-medium" htmlFor="new">
                  Nouveau mot de passe
                </label>
                <div className="relative mt-1.5">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="new"
                    type={show ? "text" : "password"}
                    required
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-11 pl-9 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShow((s) => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {show ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium" htmlFor="confirm">
                  Confirmer
                </label>
                <div className="relative mt-1.5">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="confirm"
                    type={show ? "text" : "password"}
                    required
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    className="h-11 pl-9"
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="h-11 w-full gap-2 rounded-full"
                disabled={submitting}
              >
                {submitting ? "…" : "Mettre à jour"}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
