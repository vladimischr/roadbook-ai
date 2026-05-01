import { Link } from "@tanstack/react-router";
import { type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";

/**
 * Layout commun aux pages légales (/cgu, /confidentialite, /mentions-legales).
 * Public (pas d'auth required), look éditorial cohérent avec la landing.
 */
export function LegalLayout({
  eyebrow,
  title,
  lastUpdated,
  children,
}: {
  eyebrow: string;
  title: string;
  lastUpdated: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/40 bg-background/85 backdrop-blur-xl">
        <div className="container-editorial flex items-center justify-between px-6 py-4 sm:px-10">
          <Logo />
          <Link to="/">
            <Button variant="ghost" size="sm" className="text-[13px]">
              Retour à l'accueil
            </Button>
          </Link>
        </div>
      </header>

      <main className="container-editorial px-6 py-16 sm:px-10 sm:py-24">
        <div className="mx-auto max-w-3xl">
          <div className="flex items-center gap-3">
            <span className="rule-warm" aria-hidden />
            <span className="eyebrow">{eyebrow}</span>
          </div>
          <h1 className="font-display mt-5 text-[40px] font-semibold leading-[1.05] tracking-tight text-foreground sm:text-[52px]">
            {title}
          </h1>
          <p className="mt-5 text-[13px] text-muted-foreground">
            Dernière mise à jour : {lastUpdated}
          </p>

          <article className="prose-legal mt-12 space-y-7 text-[15px] leading-[1.7] text-foreground/85">
            {children}
          </article>

          <div className="mt-16 border-t border-border/40 pt-8 text-center">
            <p className="text-[12.5px] text-muted-foreground">
              Une question&nbsp;?{" "}
              <a
                href="mailto:contact@roadbook.ai"
                className="font-medium text-primary underline-offset-4 hover:underline"
              >
                contact@roadbook.ai
              </a>
            </p>
          </div>
        </div>
      </main>

      <footer className="border-t border-border/40 bg-background">
        <div className="container-editorial px-6 py-8 sm:px-10">
          <p className="text-center text-[12.5px] text-muted-foreground">
            © {new Date().getFullYear()} Roadbook.ai
          </p>
        </div>
      </footer>
    </div>
  );
}

/* ---------- Sub-components for legal pages ---------- */

export function LegalH2({ children }: { children: ReactNode }) {
  return (
    <h2 className="font-display !mt-12 !mb-3 text-[24px] font-semibold leading-tight text-foreground">
      {children}
    </h2>
  );
}

export function LegalH3({ children }: { children: ReactNode }) {
  return (
    <h3 className="!mt-7 !mb-2 text-[16px] font-semibold text-foreground">
      {children}
    </h3>
  );
}
