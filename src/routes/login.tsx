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
      { title: "Sign in — Roadbook.ai" },
      { name: "description", content: "Sign in to Roadbook.ai with a magic link." },
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
        <div className="mx-auto flex max-w-6xl items-center px-6 py-4">
          <Logo />
        </div>
      </header>
      <main className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          {!sent ? (
            <div className="rounded-2xl border border-border bg-card p-8 shadow-sm">
              <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                We'll email you a magic link. No password needed.
              </p>
              <form onSubmit={onSubmit} className="mt-6 space-y-4">
                <div>
                  <label className="text-sm font-medium" htmlFor="email">
                    Work email
                  </label>
                  <div className="relative mt-1.5">
                    <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@agency.com"
                      className="pl-9"
                    />
                  </div>
                </div>
                <Button type="submit" className="w-full gap-2" disabled={sending}>
                  {sending ? "Sending…" : "Send magic link"}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </form>
            </div>
          ) : (
            <div className="rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
              <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-primary-soft">
                <CheckCircle2 className="h-6 w-6 text-primary" />
              </div>
              <h1 className="mt-4 text-2xl font-semibold tracking-tight">Check your inbox</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                We sent a magic link to <strong className="text-foreground">{email}</strong>. Click
                it to sign in.
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
