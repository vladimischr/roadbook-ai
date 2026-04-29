import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Clock, FileText, Sparkles } from "lucide-react";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/60">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Logo />
          <nav className="flex items-center gap-3">
            <Link to="/login">
              <Button variant="ghost" size="sm">
                Sign in
              </Button>
            </Link>
            <Link to="/login">
              <Button size="sm">Get started</Button>
            </Link>
          </nav>
        </div>
      </header>

      <main>
        <section className="mx-auto max-w-4xl px-6 pb-24 pt-24 text-center sm:pt-32">
          <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-border bg-primary-soft px-3 py-1 text-xs font-medium text-primary">
            <Sparkles className="h-3.5 w-3.5" />
            For independent travel designers
          </div>
          <h1 className="mt-6 text-4xl font-bold tracking-tight text-foreground sm:text-6xl">
            Beautiful travel roadbooks,
            <br />
            <span className="text-primary">in 5 minutes.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
            Roadbook.ai turns your trip briefs into elegant, client-ready PDF itineraries.
            Stop spending 8 hours on layouts. Start spending it on your travelers.
          </p>
          <div className="mt-10 flex items-center justify-center gap-3">
            <Link to="/login">
              <Button size="lg" className="gap-2">
                Start free <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </section>

        <section className="border-t border-border/60 bg-secondary/30">
          <div className="mx-auto grid max-w-5xl gap-8 px-6 py-20 sm:grid-cols-3">
            {[
              { icon: Clock, title: "5 minutes, not 8 hours", body: "AI drafts the structure. You refine the soul." },
              { icon: Sparkles, title: "Premium by default", body: "Clean layouts your 30–65 clients actually love." },
              { icon: FileText, title: "Export-ready PDF", body: "One click. Branded, polished, ready to send." },
            ].map((f) => (
              <div key={f.title} className="rounded-xl border border-border bg-card p-6">
                <f.icon className="h-5 w-5 text-primary" />
                <h3 className="mt-4 font-semibold text-foreground">{f.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{f.body}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-border/60">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6 text-sm text-muted-foreground">
          <span>© {new Date().getFullYear()} Roadbook.ai</span>
          <span>Built for travel designers</span>
        </div>
      </footer>
    </div>
  );
}
