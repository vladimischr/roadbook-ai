import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Mail,
  ArrowRight,
  CheckCircle2,
  Lock,
  Eye,
  EyeOff,
  Sparkles,
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
import { toast } from "sonner";

export const Route = createFileRoute("/login")({
  component: Login,
  head: () => ({
    meta: [
      { title: "Connexion — Roadbook.ai" },
      {
        name: "description",
        content: "Connectez-vous à Roadbook.ai pour gérer vos roadbooks.",
      },
    ],
  }),
});

// ============================================================================
// Login page — flow standard SaaS : email + password par défaut
// ============================================================================
// Modes :
//   - login   : connexion email + mot de passe (défaut)
//   - signup  : création de compte email + mot de passe + confirmation
//   - forgot  : demande de réinitialisation de mot de passe
//   - magic   : lien magique sans mot de passe (alternative reléguée pour les
//               users historiques qui n'ont pas encore défini de mot de passe)

type Mode = "login" | "signup" | "forgot" | "magic";

function Login() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [sending, setSending] = useState(false);
  const [emailSent, setEmailSent] = useState<
    null | "signup" | "magic" | "reset"
  >(null);

  useEffect(() => {
    if (!loading && user) navigate({ to: "/dashboard" });
  }, [user, loading, navigate]);

  // Reset les champs spécifiques quand on change de mode
  useEffect(() => {
    setPassword("");
    setConfirmPassword("");
    setShowPassword(false);
  }, [mode]);

  const onLogin = async (e: React.FormEvent) => {
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

  const onSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    if (password.length < 8) {
      toast.error("Mot de passe trop court (8 caractères minimum)");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("Les mots de passe ne correspondent pas");
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
      // Confirmation email requise (Supabase "Confirm email" ON)
      setEmailSent("signup");
    } else {
      // Auto-confirmé → redirection auto via useEffect
      toast.success("Compte créé. Bienvenue !");
    }
  };

  const onForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setSending(true);
    const { error } = await sendPasswordReset(email);
    setSending(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setEmailSent("reset");
  };

  const onMagic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setSending(true);
    const { error } = await sendMagicLink(email);
    setSending(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setEmailSent("magic");
  };

  if (emailSent) {
    return (
      <SuccessPanel
        kind={emailSent}
        email={email}
        onBack={() => {
          setEmailSent(null);
          setMode(emailSent === "signup" ? "login" : mode);
        }}
      />
    );
  }

  return (
    <PageShell>
      {mode === "login" && (
        <LoginForm
          email={email}
          setEmail={setEmail}
          password={password}
          setPassword={setPassword}
          show={showPassword}
          onToggleShow={() => setShowPassword((v) => !v)}
          onSubmit={onLogin}
          sending={sending}
          onSwitchSignup={() => setMode("signup")}
          onSwitchForgot={() => setMode("forgot")}
          onSwitchMagic={() => setMode("magic")}
        />
      )}
      {mode === "signup" && (
        <SignupForm
          email={email}
          setEmail={setEmail}
          password={password}
          setPassword={setPassword}
          confirmPassword={confirmPassword}
          setConfirmPassword={setConfirmPassword}
          show={showPassword}
          onToggleShow={() => setShowPassword((v) => !v)}
          onSubmit={onSignup}
          sending={sending}
          onSwitchLogin={() => setMode("login")}
        />
      )}
      {mode === "forgot" && (
        <ForgotForm
          email={email}
          setEmail={setEmail}
          onSubmit={onForgot}
          sending={sending}
          onBack={() => setMode("login")}
        />
      )}
      {mode === "magic" && (
        <MagicForm
          email={email}
          setEmail={setEmail}
          onSubmit={onMagic}
          sending={sending}
          onBack={() => setMode("login")}
        />
      )}
    </PageShell>
  );
}

/* ---------- Page shell ---------- */

function PageShell({ children }: { children: React.ReactNode }) {
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
            {children}
          </div>
          <p className="mt-6 text-center text-[11.5px] leading-relaxed text-text-soft">
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
        </div>
      </main>
    </div>
  );
}

/* ---------- Login form (default mode) ---------- */

function LoginForm({
  email,
  setEmail,
  password,
  setPassword,
  show,
  onToggleShow,
  onSubmit,
  sending,
  onSwitchSignup,
  onSwitchForgot,
  onSwitchMagic,
}: {
  email: string;
  setEmail: (v: string) => void;
  password: string;
  setPassword: (v: string) => void;
  show: boolean;
  onToggleShow: () => void;
  onSubmit: (e: React.FormEvent) => void;
  sending: boolean;
  onSwitchSignup: () => void;
  onSwitchForgot: () => void;
  onSwitchMagic: () => void;
}) {
  return (
    <>
      <div className="flex items-center gap-3">
        <span className="rule-warm" aria-hidden />
        <span className="eyebrow">Connexion</span>
      </div>
      <h1 className="font-display mt-5 text-[28px] font-semibold leading-tight tracking-tight text-foreground">
        Bon retour parmi nous
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
        Connectez-vous à votre espace Roadbook.
      </p>

      <form onSubmit={onSubmit} className="mt-7 space-y-4">
        <EmailField value={email} onChange={setEmail} />
        <PasswordField
          value={password}
          onChange={setPassword}
          show={show}
          onToggleShow={onToggleShow}
          autoComplete="current-password"
          rightLink={
            <button
              type="button"
              onClick={onSwitchForgot}
              className="text-[12px] text-muted-foreground hover:text-primary"
            >
              Mot de passe oublié ?
            </button>
          }
        />
        <Button
          type="submit"
          className="h-11 w-full gap-2 rounded-full transition-smooth"
          disabled={sending}
        >
          {sending ? "…" : "Se connecter"}
          <ArrowRight className="h-4 w-4" />
        </Button>
      </form>

      <div className="mt-6 rounded-xl border border-border/60 bg-surface p-4 text-center">
        <p className="text-[13px] text-muted-foreground">
          Pas encore de compte ?
        </p>
        <Button
          type="button"
          variant="outline"
          onClick={onSwitchSignup}
          className="mt-2.5 h-10 w-full gap-1.5 rounded-full"
        >
          <Sparkles className="h-3.5 w-3.5" />
          Créer mon compte
        </Button>
      </div>

      <div className="mt-5 text-center">
        <button
          type="button"
          onClick={onSwitchMagic}
          className="text-[12px] text-text-soft transition hover:text-foreground"
        >
          Recevoir un lien de connexion par email à la place
        </button>
      </div>
    </>
  );
}

/* ---------- Signup form ---------- */

function SignupForm({
  email,
  setEmail,
  password,
  setPassword,
  confirmPassword,
  setConfirmPassword,
  show,
  onToggleShow,
  onSubmit,
  sending,
  onSwitchLogin,
}: {
  email: string;
  setEmail: (v: string) => void;
  password: string;
  setPassword: (v: string) => void;
  confirmPassword: string;
  setConfirmPassword: (v: string) => void;
  show: boolean;
  onToggleShow: () => void;
  onSubmit: (e: React.FormEvent) => void;
  sending: boolean;
  onSwitchLogin: () => void;
}) {
  const passwordTooShort = password.length > 0 && password.length < 8;
  const mismatch =
    confirmPassword.length > 0 && password !== confirmPassword;

  return (
    <>
      <div className="flex items-center gap-3">
        <span className="rule-warm" aria-hidden />
        <span className="eyebrow">Inscription</span>
      </div>
      <h1 className="font-display mt-5 text-[28px] font-semibold leading-tight tracking-tight text-foreground">
        Créer votre compte
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
        Quelques secondes suffisent. Vous recevrez un email de confirmation.
      </p>

      <form onSubmit={onSubmit} className="mt-7 space-y-4">
        <EmailField value={email} onChange={setEmail} />
        <PasswordField
          value={password}
          onChange={setPassword}
          show={show}
          onToggleShow={onToggleShow}
          autoComplete="new-password"
          hint={passwordTooShort ? "8 caractères minimum" : "8 caractères minimum"}
          hintError={passwordTooShort}
        />
        <PasswordField
          value={confirmPassword}
          onChange={setConfirmPassword}
          show={show}
          onToggleShow={onToggleShow}
          autoComplete="new-password"
          label="Confirmer le mot de passe"
          hint={mismatch ? "Les mots de passe ne correspondent pas" : undefined}
          hintError={mismatch}
        />
        <Button
          type="submit"
          className="h-11 w-full gap-2 rounded-full"
          disabled={sending}
        >
          {sending ? "…" : "Créer mon compte"}
          <ArrowRight className="h-4 w-4" />
        </Button>
      </form>

      <p className="mt-6 text-center text-[12.5px] text-muted-foreground">
        Déjà un compte ?{" "}
        <button
          type="button"
          onClick={onSwitchLogin}
          className="font-medium text-primary hover:underline"
        >
          Se connecter
        </button>
      </p>
    </>
  );
}

/* ---------- Forgot password form ---------- */

function ForgotForm({
  email,
  setEmail,
  onSubmit,
  sending,
  onBack,
}: {
  email: string;
  setEmail: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  sending: boolean;
  onBack: () => void;
}) {
  return (
    <>
      <button
        type="button"
        onClick={onBack}
        className="text-[12.5px] text-muted-foreground hover:text-foreground"
      >
        ← Retour à la connexion
      </button>
      <h1 className="font-display mt-4 text-[26px] font-semibold leading-tight text-foreground">
        Mot de passe oublié
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
        Saisissez votre email — nous vous enverrons un lien pour le
        réinitialiser.
      </p>
      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <EmailField value={email} onChange={setEmail} />
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
  );
}

/* ---------- Magic link (alternative reléguée) ---------- */

function MagicForm({
  email,
  setEmail,
  onSubmit,
  sending,
  onBack,
}: {
  email: string;
  setEmail: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  sending: boolean;
  onBack: () => void;
}) {
  return (
    <>
      <button
        type="button"
        onClick={onBack}
        className="text-[12.5px] text-muted-foreground hover:text-foreground"
      >
        ← Retour à la connexion classique
      </button>
      <h1 className="font-display mt-4 text-[26px] font-semibold leading-tight text-foreground">
        Lien de connexion par email
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
        Pratique si vous n'avez pas encore défini de mot de passe. Cliquez sur
        le lien dans l'email reçu pour vous connecter directement.
      </p>
      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <EmailField value={email} onChange={setEmail} />
        <Button
          type="submit"
          className="h-11 w-full gap-2 rounded-full"
          disabled={sending}
        >
          {sending ? "Envoi…" : "Recevoir le lien"}
          <ArrowRight className="h-4 w-4" />
        </Button>
        <p className="text-[11.5px] leading-relaxed text-text-soft">
          Vérifiez vos spams si le mail tarde à arriver.
        </p>
      </form>
    </>
  );
}

/* ---------- Réutilisables ---------- */

function EmailField({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="text-sm font-medium" htmlFor="email">
        Email
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

function PasswordField({
  value,
  onChange,
  show,
  onToggleShow,
  autoComplete,
  label = "Mot de passe",
  hint,
  hintError,
  rightLink,
}: {
  value: string;
  onChange: (v: string) => void;
  show: boolean;
  onToggleShow: () => void;
  autoComplete: "current-password" | "new-password";
  label?: string;
  hint?: string;
  hintError?: boolean;
  rightLink?: React.ReactNode;
}) {
  const id = `pw-${label.replace(/\s+/g, "-")}-${autoComplete}`;
  return (
    <div>
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium" htmlFor={id}>
          {label}
        </label>
        {rightLink}
      </div>
      <div className="relative mt-1.5">
        <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          id={id}
          type={show ? "text" : "password"}
          required
          autoComplete={autoComplete}
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
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
      {hint && (
        <p
          className={
            "mt-1.5 text-[11.5px] " +
            (hintError ? "text-destructive" : "text-text-soft")
          }
        >
          {hint}
        </p>
      )}
    </div>
  );
}

/* ---------- Success panel ---------- */

function SuccessPanel({
  kind,
  email,
  onBack,
}: {
  kind: "signup" | "magic" | "reset";
  email: string;
  onBack: () => void;
}) {
  const config = {
    signup: {
      title: "Vérifiez votre boîte mail",
      message: (
        <>
          Un email de confirmation vient d'être envoyé à{" "}
          <strong className="text-foreground">{email}</strong>. Cliquez sur le
          lien pour activer votre compte, puis revenez vous connecter.
        </>
      ),
      back: "Retour à la connexion",
    },
    magic: {
      title: "Vérifiez votre boîte mail",
      message: (
        <>
          Un lien magique vient d'être envoyé à{" "}
          <strong className="text-foreground">{email}</strong>. Cliquez dessus
          pour vous connecter directement.
        </>
      ),
      back: "Retour",
    },
    reset: {
      title: "Email envoyé",
      message: (
        <>
          Si un compte existe pour{" "}
          <strong className="text-foreground">{email}</strong>, un lien de
          réinitialisation vient d'être envoyé. Vérifiez votre boîte mail.
        </>
      ),
      back: "Retour à la connexion",
    },
  }[kind];

  return (
    <PageShell>
      <div className="text-center">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-primary-soft">
          <CheckCircle2 className="h-6 w-6 text-primary" />
        </div>
        <h1 className="font-display mt-6 text-[24px] font-semibold leading-tight text-foreground">
          {config.title}
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          {config.message}
        </p>
        <p className="mt-4 text-[11.5px] leading-relaxed text-text-soft">
          Pensez à vérifier vos spams si le mail tarde à arriver.
        </p>
        <button
          type="button"
          onClick={onBack}
          className="mt-6 text-[12.5px] text-muted-foreground hover:text-foreground"
        >
          ← {config.back}
        </button>
      </div>
    </PageShell>
  );
}
