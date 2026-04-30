import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Mail, ArrowRight, CheckCircle2 } from "lucide-react";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { sendMagicLink, useAuth } from "@/lib/auth";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({
  component: Login,
  head: () => ({
    meta: [
      { title: "Connexion — Roadbook.ai" },
      {
        name: "description",
        content: "Connectez-vous à Roadbook.ai avec un lien magique.",
      },
    ],
  }),
});

function Login() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (!loading && user) navigate({ to: "/dashboard" });
  }, [user, loading, navigate]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setSending(true);
    const { error } = await sendMagicLink(email);
    setSending(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setSent(true);
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="border-b border-border/60">
        <div className="container-editorial flex items-center px-6 py-4 sm:px-10">
          <Logo />
        </div>
      </header>
      <main className="relative flex flex-1 items-center justify-center px-6 py-12">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[400px] bg-gradient-to-b from-primary-soft/40 to-transparent"
        />
        <div className="w-full max-w-md">
          {!sent ? (
            <div className="rounded-2xl border border-border bg-card p-8 shadow-soft-md sm:p-10">
              <div className="flex items-center gap-3">
                <span className="rule-warm" aria-hidden />
                <span className="eyebrow">Connexion</span>
              </div>
              <h1 className="font-display mt-5 text-[28px] font-semibold leading-tight tracking-tight text-foreground">
                Bon retour parmi nous
              </h1>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                Saisissez votre email — nous vous envoyons un lien magique
                pour vous connecter sans mot de passe.
              </p>
              <form onSubmit={onSubmit} className="mt-7 space-y-4">
                <div>
                  <label className="text-sm font-medium" htmlFor="email">
                    Email professionnel
                  </label>
                  <div className="relative mt-1.5">
                    <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="vous@agence.com"
                      className="h-11 pl-9"
                    />
                  </div>
                </div>
                <Button
                  type="submit"
                  className="h-11 w-full gap-2 rounded-full transition-smooth hover:scale-[1.01]"
                  disabled={sending}
                >
                  {sending ? "Envoi en cours…" : "Recevoir le lien"}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </form>
            </div>
          ) : (
            <div className="rounded-2xl border border-border bg-card p-8 text-center shadow-soft-md sm:p-10">
              <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-primary-soft">
                <CheckCircle2 className="h-6 w-6 text-primary" />
              </div>
              <h1 className="font-display mt-6 text-[24px] font-semibold leading-tight tracking-tight text-foreground">
                Consultez votre boîte mail
              </h1>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                Un lien magique vient d'être envoyé à{" "}
                <strong className="text-foreground">{email}</strong>. Cliquez
                dessus pour vous connecter.
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
