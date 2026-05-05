import { Outlet, Link, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import { Toaster } from "@/components/ui/sonner";

import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page introuvable</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Cette page n'existe pas ou n'est plus disponible.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Retour à l'accueil
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Roadbook.ai — Votre roadbook en 5 minutes" },
      {
        name: "description",
        content:
          "AI-powered web app for travel designers to generate professional PDF roadbooks in minutes.",
      },
      { property: "og:title", content: "Roadbook.ai — Votre roadbook en 5 minutes" },
      {
        property: "og:description",
        content:
          "AI-powered web app for travel designers to generate professional PDF roadbooks in minutes.",
      },
      { property: "og:type", content: "website" },
      {
        property: "og:image",
        content:
          "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/1f7cd519-4193-4c47-b6d2-35474d5fc242/id-preview-837973a4--12d93a8e-2eb8-4c04-b489-c670094e0f37.lovable.app-1777492976344.png",
      },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Roadbook.ai — Votre roadbook en 5 minutes" },
      {
        name: "twitter:description",
        content:
          "AI-powered web app for travel designers to generate professional PDF roadbooks in minutes.",
      },
      {
        name: "twitter:image",
        content:
          "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/1f7cd519-4193-4c47-b6d2-35474d5fc242/id-preview-837973a4--12d93a8e-2eb8-4c04-b489-c670094e0f37.lovable.app-1777492976344.png",
      },
      { name: "description", content: "AI-powered web app for travel designers to generate professional PDF roadbooks in minutes." },
      { property: "og:description", content: "AI-powered web app for travel designers to generate professional PDF roadbooks in minutes." },
      { name: "twitter:description", content: "AI-powered web app for travel designers to generate professional PDF roadbooks in minutes." },
      { property: "og:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/2SgAqDgHVXTYrzM3eL9OcreqW5I2/social-images/social-1777969198844-ChatGPT_Image_5_mai_2026,_10_19_31.webp" },
      { name: "twitter:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/2SgAqDgHVXTYrzM3eL9OcreqW5I2/social-images/social-1777969198844-ChatGPT_Image_5_mai_2026,_10_19_31.webp" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;1,400;1,600&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Toaster />
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  return <Outlet />;
}
