import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Plus, MapPin, Calendar, FileText } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import type { Tables } from "@/integrations/supabase/types";

export const Route = createFileRoute("/dashboard")({
  component: Dashboard,
  head: () => ({ meta: [{ title: "Dashboard — Roadbook.ai" }] }),
});

type Roadbook = Tables<"roadbooks">;

function Dashboard() {
  const { user } = useAuth();
  const [roadbooks, setRoadbooks] = useState<Roadbook[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("roadbooks")
      .select("*")
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setRoadbooks(data || []);
        setLoading(false);
      });
  }, [user]);

  return (
    <AppShell>
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Your roadbooks</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            All trips you've designed, in one place.
          </p>
        </div>
        <Link to="/new">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            New roadbook
          </Button>
        </Link>
      </div>

      <div className="mt-8">
        {loading ? (
          <div className="text-sm text-muted-foreground">Loading…</div>
        ) : roadbooks.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card p-16 text-center">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-primary-soft">
              <FileText className="h-6 w-6 text-primary" />
            </div>
            <h2 className="mt-4 text-lg font-semibold">No roadbooks yet</h2>
            <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
              Create your first AI-generated travel roadbook in under 5 minutes.
            </p>
            <Link to="/new" className="mt-6 inline-block">
              <Button className="gap-2">
                <Plus className="h-4 w-4" /> New roadbook
              </Button>
            </Link>
          </div>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {roadbooks.map((rb) => (
              <li key={rb.id}>
                <Link
                  to="/roadbook/$id"
                  params={{ id: rb.id }}
                  className="group block rounded-xl border border-border bg-card p-5 transition hover:border-primary/40 hover:shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="truncate font-semibold text-foreground group-hover:text-primary">
                        {rb.client_name}
                      </h3>
                      <div className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                        <MapPin className="h-3.5 w-3.5" />
                        <span className="truncate">{rb.destination}</span>
                      </div>
                    </div>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        rb.status === "ready"
                          ? "bg-primary-soft text-primary"
                          : "bg-secondary text-muted-foreground"
                      }`}
                    >
                      {rb.status}
                    </span>
                  </div>
                  <div className="mt-4 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Calendar className="h-3.5 w-3.5" />
                    {new Date(rb.created_at).toLocaleDateString(undefined, {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </AppShell>
  );
}
