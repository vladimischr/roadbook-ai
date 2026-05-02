import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Mail,
  ArrowRight,
  CheckCircle2,
  Lock,
  Eye,
  EyeOff,
} from "lucide-react";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  sendMagicLink,
  signInWithPassword,
  signUpWithPassword,
  sendPasswordReset,
  useAuth,
} from "@/lib/auth";
import { lovable } from "@/integrations/lovable";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

async function handleGoogleSignIn() {
  const result = await lovable.auth.signInWithOAuth("google", {
    redirect_uri: `${window.location.origin}/dashboard`,
  });
  if (result.error) {
    toast.error("Connexion Google impossible. Réessayez.");
  }
}

function GoogleButton() {
  return (
    <>
      <button
        type="button"
        onClick={handleGoogleSignIn}
        className="flex h-11 w-full items-center justify-center gap-2 rounded-full border border-border bg-background text-sm font-medium text-foreground transition-colors hover:bg-accent"
      >
        <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden>
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.75h3.57c2.08-1.92 3.28-4.74 3.28-8.07z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.75c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="#FBBC05" d="M5.84 14.12c-.22-.66-.35-1.36-.35-2.12s.13-1.46.35-2.12V7.04H2.18A10.99 10.99 0 0 0 1 12c0 1.78.43 3.46 1.18 4.96l3.66-2.84z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.04l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"/>
        </svg>
        Continuer avec Google
      </button>
      <div className="relative my-4">
        <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border/60" /></div>
        <div className="relative flex justify-center"><span className="bg-card px-3 text-[11px] uppercase tracking-wider text-muted-foreground">ou</span></div>
      </div>
    </>
  );
}

export const Route = createFileRoute("/login")({
  component: Login,
  head: () => ({
    meta: [
      { title: "Connexion — Roadbook.ai" },
      {
        name: "description",
        content: "Connectez-vous à Roadbook.ai avec un lien magique ou un mot de passe.",
      },
    ],
  }),
});

type Mode = "magic" | "password" | "signup" | "forgot";

function Login() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [mode, setMode] = useState<Mode>("magic");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [sending, setSending] = useState(false);
  const [magicSent, setMagicSent] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  useEffect(() => {
    if (!loading && user) navigate({ to: "/dashboard" });
  }, [user, loading, navigate]);

  // Magic link
  const onSubmitMagic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setSending(true);
    const { error } = await sendMagicLink(email);
    setSending(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setMagicSent(true);
  };

  // Password sign-in
  const onSubmitPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setSending(true);
    const { error } = await signInWithPassword(email, password);
    setSending(false);
    if (error) {
      toast.error("Email ou mot de passe incorrect");
      return;
    }
    // Redirection auto via useEffect (user devient non-null)
  };

  // Sign up
  const onSubmitSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    if (password.length < 8) {
      toast.error("Mot de passe trop court (8 caractères minimum)");
      return;
    }
    setSending(true);
    const { error, data } = await signUpWithPassword(email, password);
    setSending(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    if (data?.user && !data.session) {
      // Email de confirmation requis
      toast.success("Vérifie ta boîte mail pour confirmer ton inscription.");
      setMagicSent(true);
    } else {
      // Inscription auto-confirmée → redirige
      toast.success("Compte créé. Bienvenue !");
    }
  };

  // Forgot password
  const onSubmitForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setSending(true);
    const { error } = await sendPasswordReset(email);
    setSending(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setResetSent(true);
  };

  // Vues "succès" (mail envoyé)
  if (magicSent) {
    return (
      <SuccessPanel
        title="Consultez votre boîte mail"
        message={
          <>
            Un lien magique vient d'être envoyé à{" "}
            <strong className="text-foreground">{email}</strong>. Cliquez
            dessus pour vous connecter.
          </>
        }
        onBack={() => {
          setMagicSent(false);
          setMode("magic");
        }}
      />
    );
  }

  if (resetSent) {
    return (
      <SuccessPanel
        title="Email envoyé"
        message={
          <>
            Si un compte existe pour{" "}
            <strong className="text-foreground">{email}</strong>, un lien de
            réinitialisation vient d'être envoyé. Vérifiez votre boîte mail.
          </>
        }
        onBack={() => {
          setResetSent(false);
          setMode("password");
        }}
      />
    );
  }

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
          <div className="rounded-2xl border border-border bg-card p-8 shadow-soft-md sm:p-10">
            {mode === "forgot" ? (
              <>
                <button
                  type="button"
                  onClick={() => setMode("password")}
                  className="text-[12.5px] text-muted-foreground hover:text-foreground"
                >
                  ← Retour
                </button>
                <h1 className="font-display mt-4 text-[26px] font-semibold leading-tight text-foreground">
                  Mot de passe oublié
                </h1>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  Saisis ton email — on t'envoie un lien pour réinitialiser
                  ton mot de passe.
                </p>
                <form onSubmit={onSubmitForgot} className="mt-6 space-y-4">
                  <EmailInput value={email} onChange={setEmail} />
                  <Button
                    type="submit"
                    className="h-11 w-full gap-2 rounded-full"
                    disabled={sending}
                  >
                    {sending ? "Envoi…" : "Envoyer le lien"}
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </form>
              </>
            ) : (
              <>
                <div className="flex items-center gap-3">
                  <span className="rule-warm" aria-hidden />
                  <span className="eyebrow">
                    {mode === "signup" ? "Inscription" : "Connexion"}
                  </span>
                </div>
                <h1 className="font-display mt-5 text-[28px] font-semibold leading-tight tracking-tight text-foreground">
                  {mode === "signup"
                    ? "Créer un compte"
                    : "Bon retour parmi nous"}
                </h1>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  {mode === "signup"
                    ? "Choisissez un email + mot de passe, ou utilisez un lien magique sans mot de passe."
                    : "Connectez-vous via lien magique ou mot de passe."}
                </p>

                <div className="mt-6">
                  <GoogleButton />
                </div>

                {/* Tabs Magic link / Password */}
                <div className="mt-6 flex border-b border-border/60">
                  <button
                    type="button"
                    onClick={() => setMode("magic")}
                    className={cn(
                      "flex-1 border-b-2 pb-2.5 pt-1 text-[13px] font-medium transition",
                      mode === "magic"
                        ? "border-primary text-primary"
                        : "border-transparent text-muted-foreground hover:text-foreground",
                    )}
                  >
                    Lien magique
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setMode(mode === "signup" ? "signup" : "password")
                    }
                    className={cn(
                      "flex-1 border-b-2 pb-2.5 pt-1 text-[13px] font-medium transition",
                      mode !== "magic"
                        ? "border-primary text-primary"
                        : "border-transparent text-muted-foreground hover:text-foreground",
                    )}
                  >
                    Mot de passe
                  </button>
                </div>

                {/* Form */}
                {mode === "magic" ? (
                  <form onSubmit={onSubmitMagic} className="mt-5 space-y-4">
                    <EmailInput value={email} onChange={setEmail} />
                    <Button
                      type="submit"
                      className="h-11 w-full gap-2 rounded-full transition-smooth hover:scale-[1.01]"
                      disabled={sending}
                    >
                      {sending ? "Envoi…" : "Recevoir le lien"}
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                    <p className="text-[11.5px] leading-relaxed text-text-soft">
                      Pas de mot de passe à retenir. Vérifiez vos spams si le
                      mail tarde.
                    </p>
                    <p className="text-center text-[12.5px] text-muted-foreground">
                      Pas encore inscrit ?{" "}
                      <button
                        type="button"
                        onClick={() => setMode("signup")}
                        className="font-medium text-primary hover:underline"
                      >
                        Créer un compte
                      </button>
                    </p>
                  </form>
                ) : (
                  <form
                    onSubmit={
                      mode === "signup" ? onSubmitSignup : onSubmitPassword
                    }
                    className="mt-5 space-y-4"
                  >
                    <EmailInput value={email} onChange={setEmail} />
                    <PasswordInput
                      value={password}
                      onChange={setPassword}
                      show={showPassword}
                      onToggleShow={() => setShowPassword((v) => !v)}
                      hint={
                        mode === "signup"
                          ? "8 caractères minimum"
                          : undefined
                      }
                    />

                    {mode === "password" && (
                      <button
                        type="button"
                        onClick={() => setMode("forgot")}
                        className="text-[12px] text-muted-foreground hover:text-primary"
                      >
                        Mot de passe oublié ?
                      </button>
                    )}

                    <Button
                      type="submit"
                      className="h-11 w-full gap-2 rounded-full"
                      disabled={sending}
                    >
                      {sending
                        ? "…"
                        : mode === "signup"
                          ? "Créer mon compte"
                          : "Se connecter"}
                      <ArrowRight className="h-4 w-4" />
                    </Button>

                    <p className="text-center text-[12.5px] text-muted-foreground">
                      {mode === "signup" ? (
                        <>
                          Déjà un compte ?{" "}
                          <button
                            type="button"
                            onClick={() => setMode("password")}
                            className="font-medium text-primary hover:underline"
                          >
                            Se connecter
                          </button>
                        </>
                      ) : (
                        <>
                          Pas encore inscrit ?{" "}
                          <button
                            type="button"
                            onClick={() => setMode("signup")}
                            className="font-medium text-primary hover:underline"
                          >
                            Créer un compte
                          </button>
                        </>
                      )}
                    </p>
                  </form>
                )}

                <p className="mt-6 text-[11.5px] leading-relaxed text-text-soft">
                  En continuant, vous acceptez nos{" "}
                  <Link
                    to="/cgu"
                    className="underline-offset-4 hover:text-foreground hover:underline"
                  >
                    CGU
                  </Link>{" "}
                  et notre{" "}
                  <Link
                    to="/confidentialite"
                    className="underline-offset-4 hover:text-foreground hover:underline"
                  >
                    politique de confidentialité
                  </Link>
                  .
                </p>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

/* ---------- Inputs ---------- */

function EmailInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
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
          autoComplete="email"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="vous@agence.com"
          className="h-11 pl-9"
        />
      </div>
    </div>
  );
}

function PasswordInput({
  value,
  onChange,
  show,
  onToggleShow,
  hint,
}: {
  value: string;
  onChange: (v: string) => void;
  show: boolean;
  onToggleShow: () => void;
  hint?: string;
}) {
  return (
    <div>
      <label className="text-sm font-medium" htmlFor="password">
        Mot de passe
      </label>
      <div className="relative mt-1.5">
        <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          id="password"
          type={show ? "text" : "password"}
          required
          autoComplete={hint ? "new-password" : "current-password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="••••••••"
          className="h-11 pl-9 pr-10"
        />
        <button
          type="button"
          onClick={onToggleShow}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          aria-label={show ? "Cacher" : "Afficher"}
        >
          {show ? (
            <EyeOff className="h-4 w-4" />
          ) : (
            <Eye className="h-4 w-4" />
          )}
        </button>
      </div>
      {hint && <p className="mt-1.5 text-[11.5px] text-text-soft">{hint}</p>}
    </div>
  );
}

/* ---------- Success panel (after magic link / reset sent) ---------- */

function SuccessPanel({
  title,
  message,
  onBack,
}: {
  title: string;
  message: React.ReactNode;
  onBack: () => void;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="border-b border-border/60">
        <div className="container-editorial flex items-center px-6 py-4 sm:px-10">
          <Logo />
        </div>
      </header>
      <main className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <div className="rounded-2xl border border-border bg-card p-8 text-center shadow-soft-md sm:p-10">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-primary-soft">
              <CheckCircle2 className="h-6 w-6 text-primary" />
            </div>
            <h1 className="font-display mt-6 text-[24px] font-semibold leading-tight text-foreground">
              {title}
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              {message}
            </p>
            <button
              type="button"
              onClick={onBack}
              className="mt-6 text-[12.5px] text-muted-foreground hover:text-foreground"
            >
              ← Retour
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
