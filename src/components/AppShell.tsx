import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  BookOpen,
  Plus,
  CreditCard,
  LogOut,
  Menu,
  X,
  PanelLeftClose,
  PanelLeftOpen,
  UserCircle2,
  ShieldCheck,
  Send,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { signOut, useAuth } from "@/lib/auth";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

/* ---------- Topbar slot context (so pages can inject custom topbar content) ---------- */

interface TopbarSlotContextValue {
  setSlot: (slot: ReactNode | null) => void;
  setBreadcrumb: (crumb: ReactNode | null) => void;
}
const TopbarSlotContext = createContext<TopbarSlotContextValue | null>(null);

export function useTopbarSlot() {
  return useContext(TopbarSlotContext);
}

/* ---------- Focus mode (sidebar collapse for distraction-free editing) ---------- */

interface FocusModeContextValue {
  focus: boolean;
  toggle: () => void;
}
const FocusModeContext = createContext<FocusModeContextValue | null>(null);
export function useFocusMode() {
  return useContext(FocusModeContext);
}

/* ---------- Sidebar nav config ---------- */

const NAV_ITEMS = [
  { to: "/dashboard" as const, label: "Vos roadbooks", icon: BookOpen },
  { to: "/new" as const, label: "Nouveau", icon: Plus },
  { to: "/briefs" as const, label: "Briefs clients", icon: Send },
];

const SECONDARY_NAV_ITEMS = [
  { to: "/profil" as const, label: "Mon profil", icon: UserCircle2 },
  { to: "/billing" as const, label: "Mon abonnement", icon: CreditCard },
];

// Liste des emails admin exposée côté client pour afficher le lien
// "Administration" dans la sidebar. C'est purement UI — le vrai contrôle
// d'accès est server-side via ADMIN_EMAILS dans /api/admin-users.
function isClientAdmin(email: string | undefined | null): boolean {
  if (!email) return false;
  const raw = (import.meta.env.VITE_ADMIN_EMAILS as string | undefined) || "";
  const list = raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return list.includes(email.toLowerCase());
}

/* ---------- AppShell ---------- */

export function AppShell({
  children,
  topbarSlot,
  breadcrumb,
}: {
  children: ReactNode;
  topbarSlot?: ReactNode;
  breadcrumb?: ReactNode;
}) {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [focus, setFocus] = useState(false);
  const [slotState, setSlotState] = useState<ReactNode | null>(null);
  const [crumbState, setCrumbState] = useState<ReactNode | null>(null);
  const path = useRouterState({ select: (r) => r.location.pathname });

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [user, loading, navigate]);

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [path]);

  const slotCtx = useMemo<TopbarSlotContextValue>(
    () => ({ setSlot: setSlotState, setBreadcrumb: setCrumbState }),
    [],
  );
  const focusCtx = useMemo<FocusModeContextValue>(
    () => ({ focus, toggle: () => setFocus((v) => !v) }),
    [focus],
  );

  const effectiveSlot = topbarSlot ?? slotState;
  const effectiveCrumb = breadcrumb ?? crumbState ?? <DefaultBreadcrumb path={path} />;

  if (loading || !user) {
    return (
      <div className="grid min-h-screen place-items-center bg-canvas text-sm text-muted-foreground">
        Chargement…
      </div>
    );
  }

  return (
    <FocusModeContext.Provider value={focusCtx}>
      <TopbarSlotContext.Provider value={slotCtx}>
        <div className="min-h-screen bg-canvas">
          {/* ---------- Desktop sidebar ---------- */}
          {!focus && (
            <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-border/60 bg-sidebar lg:flex">
              <SidebarContent user={user} onSignOut={async () => { await signOut(); navigate({ to: "/" }); }} />
            </aside>
          )}

          {/* ---------- Mobile drawer ---------- */}
          {mobileOpen && (
            <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
              <div
                className="absolute inset-0 bg-foreground/40 backdrop-blur-sm"
                onClick={() => setMobileOpen(false)}
              />
              <aside className="absolute inset-y-0 left-0 flex w-72 max-w-[85%] flex-col border-r border-border/60 bg-sidebar shadow-soft-lg">
                <div className="flex items-center justify-between px-5 pt-5">
                  <Wordmark />
                  <button
                    type="button"
                    aria-label="Fermer le menu"
                    onClick={() => setMobileOpen(false)}
                    className="grid h-9 w-9 place-items-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground transition-smooth"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <SidebarContent
                  user={user}
                  onSignOut={async () => { await signOut(); navigate({ to: "/" }); }}
                  hideHeader
                />
              </aside>
            </div>
          )}

          {/* ---------- Main column ---------- */}
          <div className={focus ? "" : "lg:pl-60"}>
            {/* Topbar */}
            <header className="sticky top-0 z-20 border-b border-border/50 bg-canvas/85 backdrop-blur-xl">
              <div className="flex h-[60px] items-center gap-3 px-4 sm:px-6 lg:px-10">
                {/* Mobile: hamburger */}
                <button
                  type="button"
                  aria-label="Ouvrir le menu"
                  onClick={() => setMobileOpen(true)}
                  className="grid h-9 w-9 place-items-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground transition-smooth lg:hidden"
                >
                  <Menu className="h-4 w-4" />
                </button>

                {/* Desktop: focus mode toggle */}
                <button
                  type="button"
                  aria-label={focus ? "Afficher la barre latérale" : "Masquer la barre latérale"}
                  onClick={() => setFocus((v) => !v)}
                  className="hidden h-9 w-9 place-items-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground transition-smooth lg:grid"
                  title={focus ? "Afficher la barre latérale" : "Mode focus"}
                >
                  {focus ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
                </button>

                {/* Breadcrumb */}
                <div className="min-w-0 flex-1 truncate text-[13px] text-muted-foreground">
                  {effectiveCrumb}
                </div>

                {/* Page-injected topbar slot */}
                <div className="flex shrink-0 items-center gap-2">{effectiveSlot}</div>
              </div>
            </header>

            <main className="min-h-[calc(100vh-60px)]">{children}</main>
          </div>
        </div>
      </TopbarSlotContext.Provider>
    </FocusModeContext.Provider>
  );
}

/* ---------- Sidebar pieces ---------- */

function SidebarContent({
  user,
  onSignOut,
  hideHeader = false,
}: {
  user: { email?: string };
  onSignOut: () => void | Promise<void>;
  hideHeader?: boolean;
}) {
  return (
    <>
      {!hideHeader && (
        <div className="px-6 pt-7">
          <Wordmark />
        </div>
      )}
      <nav className="mt-8 flex-1 px-3">
        <ul className="space-y-0.5">
          {NAV_ITEMS.map((item) => (
            <li key={item.to}>
              <SidebarLink to={item.to} icon={item.icon} label={item.label} />
            </li>
          ))}
        </ul>

        <div className="mx-3 my-5 h-px bg-border/60" />

        <ul className="space-y-0.5">
          {SECONDARY_NAV_ITEMS.map((item) => (
            <li key={item.to}>
              <SidebarLink to={item.to} icon={item.icon} label={item.label} />
            </li>
          ))}
        </ul>

        {isClientAdmin(user.email) && (
          <>
            <div className="mx-3 my-5 h-px bg-border/60" />
            <ul className="space-y-0.5">
              <li>
                <SidebarLink to="/admin" icon={ShieldCheck} label="Administration" />
              </li>
            </ul>
          </>
        )}
      </nav>

      <div className="border-t border-border/50 px-5 py-4">
        <p className="truncate text-[11px] uppercase tracking-[0.18em] text-muted-foreground/70">
          Connecté
        </p>
        <p className="mt-1 truncate text-[13px] text-foreground/85" title={user.email}>
          {user.email}
        </p>
        <Button
          variant="ghost"
          size="sm"
          className="mt-3 w-full justify-start gap-2 text-[13px] text-muted-foreground hover:text-foreground"
          onClick={onSignOut}
        >
          <LogOut className="h-3.5 w-3.5" />
          Se déconnecter
        </Button>
      </div>
    </>
  );
}

type SidebarLinkPath =
  | "/dashboard"
  | "/new"
  | "/billing"
  | "/profil"
  | "/admin"
  | "/briefs";

function SidebarLink({
  to,
  icon: Icon,
  label,
  disabled = false,
}: {
  to: SidebarLinkPath;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  disabled?: boolean;
}) {
  if (disabled) {
    return (
      <span className="flex cursor-not-allowed items-center gap-3 rounded-lg px-3 py-2 text-[14px] font-medium text-muted-foreground/50">
        <Icon className="h-4 w-4" />
        {label}
      </span>
    );
  }
  return (
    <Link
      to={to}
      activeProps={{
        className:
          "bg-primary-soft text-primary [&_svg]:text-primary",
      }}
      inactiveProps={{
        className: "text-foreground/75 hover:bg-muted hover:text-foreground",
      }}
      className="flex items-center gap-3 rounded-lg px-3 py-2 text-[14px] font-medium transition-smooth"
    >
      <Icon className="h-4 w-4" />
      {label}
    </Link>
  );
}

function Wordmark() {
  return (
    <Link to="/" className="inline-flex items-baseline gap-0.5">
      <span className="font-display text-[22px] font-semibold tracking-tight text-foreground">
        Roadbook
      </span>
      <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
        .ai
      </span>
    </Link>
  );
}

/* ---------- Default breadcrumb (per route) ---------- */

function DefaultBreadcrumb({ path }: { path: string }) {
  if (path.startsWith("/dashboard")) {
    return <BreadcrumbLine items={[{ label: "Vos roadbooks" }]} />;
  }
  if (path.startsWith("/new")) {
    return (
      <BreadcrumbLine
        items={[
          { label: "Vos roadbooks", to: "/dashboard" },
          { label: "Nouveau roadbook" },
        ]}
      />
    );
  }
  if (path.startsWith("/billing")) {
    return (
      <BreadcrumbLine
        items={[
          { label: "Vos roadbooks", to: "/dashboard" },
          { label: "Mon abonnement" },
        ]}
      />
    );
  }
  if (path.startsWith("/profil")) {
    return (
      <BreadcrumbLine
        items={[
          { label: "Vos roadbooks", to: "/dashboard" },
          { label: "Mon profil" },
        ]}
      />
    );
  }
  if (path.startsWith("/admin")) {
    return (
      <BreadcrumbLine
        items={[
          { label: "Vos roadbooks", to: "/dashboard" },
          { label: "Administration" },
        ]}
      />
    );
  }
  if (path.startsWith("/briefs")) {
    return (
      <BreadcrumbLine
        items={[
          { label: "Vos roadbooks", to: "/dashboard" },
          { label: "Briefs clients" },
        ]}
      />
    );
  }
  return <BreadcrumbLine items={[{ label: "" }]} />;
}

export function BreadcrumbLine({
  items,
}: {
  items: Array<{ label: string; to?: SidebarLinkPath }>;
}) {
  return (
    <nav aria-label="Fil d'Ariane" className="flex items-center gap-2 text-[13px] text-muted-foreground">
      {items.map((it, i) => {
        const isLast = i === items.length - 1;
        return (
          <span key={i} className="flex items-center gap-2">
            {it.to && !isLast ? (
              <Link
                to={it.to}
                className="text-muted-foreground transition-smooth hover:text-foreground"
              >
                {it.label}
              </Link>
            ) : (
              <span className={isLast ? "font-medium text-foreground/90" : ""}>{it.label}</span>
            )}
            {!isLast && <span className="text-muted-foreground/50">›</span>}
          </span>
        );
      })}
    </nav>
  );
}
