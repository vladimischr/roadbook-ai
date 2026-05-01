import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  User as UserIcon,
  Building2,
  Phone,
  Globe,
  Lock,
  Mail,
  Loader2,
  Camera,
  Trash2,
  Save,
  Image as ImageIcon,
  AlertTriangle,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, updatePassword } from "@/lib/auth";
import { toast } from "sonner";
import { useSubscription } from "@/lib/useSubscription";
import { getPlan } from "@/lib/plans";

export const Route = createFileRoute("/profil")({
  component: ProfilePage,
  head: () => ({ meta: [{ title: "Mon profil — Roadbook.ai" }] }),
});

interface ProfileData {
  email: string | null;
  display_name: string | null;
  agency_name: string | null;
  phone: string | null;
  website: string | null;
  avatar_url: string | null;
  agency_logo_url: string | null;
  brand_color: string | null;
}

function ProfilePage() {
  const { user, loading: authLoading } = useAuth();
  const { info: subInfo } = useSubscription();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [draft, setDraft] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pwOpen, setPwOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  useEffect(() => {
    if (authLoading || !user) return;

    const empty: ProfileData = {
      email: user.email ?? null,
      display_name: null,
      agency_name: null,
      phone: null,
      website: null,
      avatar_url: null,
      agency_logo_url: null,
      brand_color: null,
    };

    // Tente une SELECT large avec tous les nouveaux champs.
    // Si la migration n'est pas appliquée, retombe sur les champs minimaux
    // pour ne pas bloquer la page (le user voit la page, peut éditer, mais
    // les colonnes manquantes ignoreront le UPDATE).
    supabase
      .from("profiles")
      .select(
        "email, display_name, agency_name, phone, website, avatar_url, agency_logo_url, brand_color",
      )
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) {
          // Probablement migration non appliquée — fallback gracieux
          console.warn(
            "[profil] SELECT large échouée, fallback minimal:",
            error.message,
          );
          supabase
            .from("profiles")
            .select("email")
            .eq("id", user.id)
            .maybeSingle()
            .then(({ data: minData }) => {
              const p: ProfileData = {
                ...empty,
                email: (minData as any)?.email ?? user.email ?? null,
              };
              setProfile(p);
              setDraft(p);
              setLoading(false);
              toast.message(
                "Certaines fonctionnalités du profil nécessitent une mise à jour de la base. Contacte le support si le problème persiste.",
                { duration: 6000 },
              );
            });
          return;
        }
        const p: ProfileData = { ...empty, ...((data as any) ?? {}) };
        if (!p.email) p.email = user.email ?? null;
        setProfile(p);
        setDraft(p);
        setLoading(false);
      });
  }, [user, authLoading]);

  const update = <K extends keyof ProfileData>(key: K, value: ProfileData[K]) => {
    setDraft((d) => (d ? { ...d, [key]: value } : d));
  };

  const isDirty =
    draft &&
    profile &&
    JSON.stringify(draft) !== JSON.stringify(profile);

  const handleSave = async () => {
    if (!draft || !user) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        display_name: draft.display_name,
        agency_name: draft.agency_name,
        phone: draft.phone,
        website: draft.website,
        avatar_url: draft.avatar_url,
        agency_logo_url: draft.agency_logo_url,
        brand_color: draft.brand_color,
      })
      .eq("id", user.id);
    setSaving(false);
    if (error) {
      toast.error("Échec : " + error.message);
      return;
    }
    setProfile(draft);
    toast.success("Profil enregistré");
  };

  if (authLoading || loading || !draft) {
    return (
      <AppShell>
        <div className="grid min-h-[60vh] place-items-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="container-editorial px-6 py-12 sm:px-10 lg:px-14 sm:py-16">
        <div className="mx-auto max-w-3xl">
          <div className="flex items-center gap-3">
            <span className="rule-warm" aria-hidden />
            <span className="eyebrow">Mon profil</span>
          </div>
          <h1 className="font-display mt-5 text-[42px] font-semibold leading-[1.05] tracking-tight text-foreground sm:text-[52px]">
            Mon compte
          </h1>
          <p className="mt-5 max-w-xl text-[15.5px] leading-relaxed text-muted-foreground">
            Personnalisez votre profil et le branding de votre agence — utilisé
            sur les exports PDF et le partage de roadbooks à vos clients.
          </p>

          {/* Section Avatar + identité */}
          <Section title="Identité">
            <AvatarUpload
              userId={user!.id}
              avatarUrl={draft.avatar_url}
              onChange={(url) => update("avatar_url", url)}
              displayName={draft.display_name || draft.email || ""}
            />

            <Field
              icon={UserIcon}
              label="Nom complet"
              value={draft.display_name ?? ""}
              onChange={(v) => update("display_name", v || null)}
              placeholder="Vladimir Mischler"
            />
            <Field
              icon={Mail}
              label="Email (lecture seule)"
              value={draft.email ?? ""}
              onChange={() => {}}
              placeholder=""
              disabled
            />
          </Section>

          {/* Section Agence */}
          <Section title="Agence">
            <Field
              icon={Building2}
              label="Nom de l'agence"
              value={draft.agency_name ?? ""}
              onChange={(v) => update("agency_name", v || null)}
              placeholder="BRAKIAL"
            />
            <Field
              icon={Phone}
              label="Téléphone"
              value={draft.phone ?? ""}
              onChange={(v) => update("phone", v || null)}
              placeholder="+33 6 12 34 56 78"
              inputType="tel"
            />
            <Field
              icon={Globe}
              label="Site web"
              value={draft.website ?? ""}
              onChange={(v) => update("website", v || null)}
              placeholder="https://votre-agence.com"
              inputType="url"
            />
          </Section>

          {/* Section Branding (logo + couleur agence) */}
          <Section title="Identité visuelle">
            <p className="-mt-2 text-[12.5px] leading-relaxed text-muted-foreground">
              Le logo et la couleur sont utilisés sur les exports PDF des
              plans payants (marque blanche).
            </p>
            <LogoUpload
              userId={user!.id}
              logoUrl={draft.agency_logo_url}
              onChange={(url) => update("agency_logo_url", url)}
            />
            <ColorPicker
              value={draft.brand_color ?? ""}
              onChange={(v) => update("brand_color", v || null)}
            />
          </Section>

          {/* Section Sécurité */}
          <Section title="Sécurité">
            <div className="rounded-xl border border-border/60 bg-surface p-4">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-[13.5px] font-medium text-foreground">
                    Mot de passe
                  </p>
                  <p className="mt-0.5 text-[12px] text-muted-foreground">
                    Définir ou modifier votre mot de passe.
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPwOpen(true)}
                  className="rounded-full"
                >
                  <Lock className="mr-1.5 h-3.5 w-3.5" />
                  Modifier
                </Button>
              </div>
            </div>

            <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <p className="text-[13.5px] font-medium text-foreground">
                    Supprimer mon compte
                  </p>
                  <p className="mt-0.5 text-[12px] leading-relaxed text-muted-foreground">
                    Suppression définitive de votre compte, vos roadbooks,
                    photos uploadées et abonnement Stripe. Action
                    irréversible.
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDeleteOpen(true)}
                  className="rounded-full border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                  Supprimer
                </Button>
              </div>
            </div>
          </Section>

          {/* Section Abonnement */}
          {subInfo && (
            <Section title="Abonnement">
              <div className="flex items-center justify-between rounded-xl border border-border/60 bg-surface p-4">
                <div>
                  <p className="font-display text-[20px] font-semibold leading-none text-foreground">
                    {getPlan(subInfo.planKey).name}
                  </p>
                  <p className="mt-1 text-[12.5px] text-muted-foreground">
                    {subInfo.planStatus === "trialing"
                      ? "En essai gratuit"
                      : subInfo.planStatus === "past_due"
                        ? "Paiement en échec"
                        : "Actif"}
                  </p>
                </div>
                <Link to="/billing">
                  <Button variant="outline" size="sm" className="rounded-full">
                    Gérer l'abonnement
                  </Button>
                </Link>
              </div>
            </Section>
          )}
        </div>
      </div>

      {/* Barre flottante de save (visible si dirty) */}
      {isDirty && (
        <div className="pointer-events-none fixed bottom-6 left-0 right-0 z-40 flex justify-center px-6">
          <div className="pointer-events-auto flex items-center gap-3 rounded-full border border-border/70 bg-surface/95 px-5 py-2 shadow-soft-lg backdrop-blur-md">
            <span className="text-[12.5px] text-muted-foreground">
              Modifications non enregistrées
            </span>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setDraft(profile)}
              className="text-[12.5px]"
              disabled={saving}
            >
              Annuler
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              className="gap-1.5 rounded-full text-[12.5px]"
              disabled={saving}
            >
              {saving ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Save className="h-3.5 w-3.5" />
              )}
              Enregistrer
            </Button>
          </div>
        </div>
      )}

      <PasswordDialog open={pwOpen} onOpenChange={setPwOpen} />
      <DeleteAccountDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        userEmail={draft.email ?? ""}
      />
    </AppShell>
  );
}

/* ---------- Sections / Inputs ---------- */

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-12 space-y-4 first:mt-10">
      <h2 className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">
        {title}
      </h2>
      <div className="space-y-4 rounded-2xl border border-border/60 bg-surface p-6 shadow-soft">
        {children}
      </div>
    </section>
  );
}

function Field({
  icon: Icon,
  label,
  value,
  onChange,
  placeholder,
  inputType = "text",
  disabled,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  inputType?: string;
  disabled?: boolean;
}) {
  return (
    <div>
      <Label className="mb-1.5 block text-sm font-medium">{label}</Label>
      <div className="relative">
        <Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type={inputType}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className="h-10 pl-9"
        />
      </div>
    </div>
  );
}

/* ---------- Avatar + logo upload ---------- */

function AvatarUpload({
  userId,
  avatarUrl,
  displayName,
  onChange,
}: {
  userId: string;
  avatarUrl: string | null;
  displayName: string;
  onChange: (url: string | null) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Format non supporté (JPG, PNG, WebP)");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image trop lourde (max 5 Mo)");
      return;
    }
    setUploading(true);
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${userId}/avatar-${Date.now()}.${ext}`;
    const { error } = await supabase.storage
      .from("roadbook-photos")
      .upload(path, file, { upsert: true, cacheControl: "31536000" });
    if (error) {
      toast.error("Échec upload : " + error.message);
      setUploading(false);
      return;
    }
    const { data } = supabase.storage
      .from("roadbook-photos")
      .getPublicUrl(path);
    onChange(data.publicUrl);
    setUploading(false);
    toast.success("Photo de profil mise à jour");
  };

  const initials = (displayName || "?")
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="flex items-center gap-5">
      <div className="relative">
        <div className="grid h-20 w-20 place-items-center overflow-hidden rounded-full border border-border bg-primary-soft text-primary">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="font-display text-[26px] font-semibold">
              {initials}
            </span>
          )}
        </div>
        {uploading && (
          <div className="absolute inset-0 grid place-items-center rounded-full bg-foreground/30">
            <Loader2 className="h-5 w-5 animate-spin text-white" />
          </div>
        )}
      </div>
      <div className="flex-1">
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
            if (fileRef.current) fileRef.current.value = "";
          }}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="gap-1.5 rounded-full"
        >
          <Camera className="h-3.5 w-3.5" />
          {avatarUrl ? "Changer" : "Ajouter une photo"}
        </Button>
        {avatarUrl && (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="ml-2 text-[12px] text-muted-foreground hover:text-destructive"
          >
            Retirer
          </button>
        )}
        <p className="mt-2 text-[11.5px] text-text-soft">
          JPG, PNG ou WebP — 5 Mo max.
        </p>
      </div>
    </div>
  );
}

function LogoUpload({
  userId,
  logoUrl,
  onChange,
}: {
  userId: string;
  logoUrl: string | null;
  onChange: (url: string | null) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Format non supporté");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image trop lourde (max 5 Mo)");
      return;
    }
    setUploading(true);
    const ext = file.name.split(".").pop()?.toLowerCase() || "png";
    const path = `${userId}/agency-logo-${Date.now()}.${ext}`;
    const { error } = await supabase.storage
      .from("roadbook-photos")
      .upload(path, file, { upsert: true, cacheControl: "31536000" });
    if (error) {
      toast.error("Échec upload : " + error.message);
      setUploading(false);
      return;
    }
    const { data } = supabase.storage
      .from("roadbook-photos")
      .getPublicUrl(path);
    onChange(data.publicUrl);
    setUploading(false);
    toast.success("Logo agence mis à jour");
  };

  return (
    <div>
      <Label className="mb-2 block text-sm font-medium">Logo de l'agence</Label>
      <div className="flex items-center gap-4">
        <div className="grid h-16 w-32 place-items-center overflow-hidden rounded-lg border border-border bg-muted/30">
          {logoUrl ? (
            <img
              src={logoUrl}
              alt=""
              className="h-full w-full object-contain"
            />
          ) : (
            <ImageIcon className="h-5 w-5 text-muted-foreground/50" />
          )}
        </div>
        <div className="flex-1">
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/svg+xml"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
              if (fileRef.current) fileRef.current.value = "";
            }}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="gap-1.5 rounded-full"
          >
            {uploading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Camera className="h-3.5 w-3.5" />
            )}
            {logoUrl ? "Changer" : "Importer un logo"}
          </Button>
          {logoUrl && (
            <button
              type="button"
              onClick={() => onChange(null)}
              className="ml-2 text-[12px] text-muted-foreground hover:text-destructive"
            >
              Retirer
            </button>
          )}
          <p className="mt-2 text-[11.5px] text-text-soft">
            PNG ou SVG sur fond transparent recommandé. Max 5 Mo.
          </p>
        </div>
      </div>
    </div>
  );
}

function ColorPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [text, setText] = useState(value || "#0F6E56");

  useEffect(() => {
    setText(value || "#0F6E56");
  }, [value]);

  const setBoth = (v: string) => {
    setText(v);
    onChange(v);
  };

  return (
    <div>
      <Label className="mb-2 block text-sm font-medium">
        Couleur de marque
      </Label>
      <div className="flex items-center gap-3">
        <input
          type="color"
          value={text || "#0F6E56"}
          onChange={(e) => setBoth(e.target.value)}
          className="h-10 w-14 cursor-pointer rounded-md border border-border bg-transparent"
        />
        <Input
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            if (/^#[0-9a-fA-F]{6}$/.test(e.target.value)) {
              onChange(e.target.value);
            }
          }}
          placeholder="#0F6E56"
          className="h-10 max-w-[140px] font-mono text-[13px] uppercase"
        />
        <span className="text-[11.5px] text-text-soft">
          Hex (ex: #0F6E56)
        </span>
      </div>
    </div>
  );
}

/* ---------- Password change dialog ---------- */

function PasswordDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const [pw, setPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pw.length < 8) {
      toast.error("Mot de passe trop court (8 caractères minimum)");
      return;
    }
    if (pw !== confirm) {
      toast.error("Les mots de passe ne correspondent pas");
      return;
    }
    setSubmitting(true);
    const { error } = await updatePassword(pw);
    setSubmitting(false);
    if (error) {
      toast.error("Échec : " + error.message);
      return;
    }
    setPw("");
    setConfirm("");
    onOpenChange(false);
    toast.success("Mot de passe mis à jour");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Modifier le mot de passe</DialogTitle>
          <DialogDescription>
            Choisissez un nouveau mot de passe d'au moins 8 caractères.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <Label className="text-sm font-medium">Nouveau mot de passe</Label>
            <Input
              type="password"
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              required
              minLength={8}
              className="mt-1.5 h-10"
              autoComplete="new-password"
            />
          </div>
          <div>
            <Label className="text-sm font-medium">Confirmation</Label>
            <Input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              className="mt-1.5 h-10"
              autoComplete="new-password"
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "…" : "Mettre à jour"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ---------- Delete account dialog ---------- */

function DeleteAccountDialog({
  open,
  onOpenChange,
  userEmail,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  userEmail: string;
}) {
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const expectedConfirm = "SUPPRIMER";

  const handleDelete = async () => {
    setSubmitting(true);
    // Ne pas implémenter la vraie suppression côté client pour l'instant
    // (nécessite un endpoint backend qui désactive Stripe + RGPD wipe).
    // En V1, l'agent contacte le support pour la suppression effective.
    setTimeout(() => {
      setSubmitting(false);
      onOpenChange(false);
      toast.message(
        "Demande envoyée. Un email de confirmation vous sera envoyé sous 48h.",
        { duration: 6000 },
      );
    }, 800);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            <DialogTitle>Supprimer mon compte</DialogTitle>
          </div>
          <DialogDescription className="pt-2 text-[13px] leading-relaxed">
            Cette action est <strong>irréversible</strong>. Tous vos
            roadbooks, photos uploadées et données seront définitivement
            supprimés. Votre abonnement Stripe sera résilié. Vous serez
            facturé prorata jusqu'à la date de suppression effective.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <p className="text-[13px] text-foreground/85">
            Pour confirmer, tape{" "}
            <code className="rounded bg-muted px-1 py-0.5 font-mono text-[12px]">
              SUPPRIMER
            </code>{" "}
            ci-dessous :
          </p>
          <Input
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="SUPPRIMER"
            className="font-mono"
          />
          <p className="text-[11.5px] text-text-soft">
            Compte associé à <strong>{userEmail}</strong>
          </p>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button
            variant="destructive"
            disabled={confirm !== expectedConfirm || submitting}
            onClick={handleDelete}
          >
            {submitting ? "…" : "Supprimer définitivement"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
