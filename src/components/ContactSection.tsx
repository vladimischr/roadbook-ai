import { useState } from "react";
import { Mail, Send, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export function ContactSection() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
    website: "", // honeypot
  });
  const [status, setStatus] = useState<"idle" | "loading" | "success">("idle");

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (status === "loading") return;

    if (!form.name.trim() || !form.email.trim() || form.message.trim().length < 5) {
      toast.error("Merci de remplir nom, email et un message d'au moins 5 caractères.");
      return;
    }

    setStatus("loading");
    try {
      const res = await fetch("/api/public/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || "Erreur lors de l'envoi");
      }
      setStatus("success");
      setForm({ name: "", email: "", subject: "", message: "", website: "" });
      toast.success("Merci ! Votre message a bien été envoyé.");
    } catch (err) {
      setStatus("idle");
      toast.error(
        err instanceof Error ? err.message : "Impossible d'envoyer le message.",
      );
    }
  };

  return (
    <section
      id="contact"
      className="relative border-t border-border/40 bg-surface-warm"
    >
      <div className="container-editorial grid gap-12 px-6 py-24 sm:px-10 sm:py-28 lg:grid-cols-[1fr_1.2fr]">
        <div className="space-y-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-muted-foreground">
            Contact
          </p>
          <h2 className="font-display text-[36px] font-semibold leading-[1.08] tracking-tight text-foreground sm:text-[44px]">
            Parlons de votre <span className="italic">prochain voyage.</span>
          </h2>
          <p className="max-w-md text-[15px] leading-relaxed text-muted-foreground">
            Une question, un projet sur-mesure, un partenariat ? Notre équipe
            vous répond sous 24h ouvrées.
          </p>
          <div className="flex items-center gap-3 pt-2 text-[13.5px] text-foreground/80">
            <Mail className="h-4 w-4 text-primary" />
            <span>Réponse sous 24h ouvrées</span>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-5 rounded-2xl border border-border/60 bg-surface p-6 shadow-sm sm:p-8"
        >
          {/* Honeypot — hidden from real users */}
          <input
            type="text"
            name="website"
            value={form.website}
            onChange={handleChange}
            tabIndex={-1}
            autoComplete="off"
            aria-hidden="true"
            style={{
              position: "absolute",
              left: "-10000px",
              width: "1px",
              height: "1px",
              opacity: 0,
            }}
          />

          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="contact-name">Nom</Label>
              <Input
                id="contact-name"
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="Votre nom"
                required
                maxLength={120}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact-email">Email</Label>
              <Input
                id="contact-email"
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                placeholder="vous@exemple.com"
                required
                maxLength={255}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="contact-subject">Sujet</Label>
            <Input
              id="contact-subject"
              name="subject"
              value={form.subject}
              onChange={handleChange}
              placeholder="L'objet de votre message"
              maxLength={200}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="contact-message">Message</Label>
            <Textarea
              id="contact-message"
              name="message"
              value={form.message}
              onChange={handleChange}
              placeholder="Dites-nous tout…"
              required
              rows={6}
              maxLength={5000}
            />
          </div>

          <Button
            type="submit"
            size="lg"
            disabled={status === "loading" || status === "success"}
            className="h-11 w-full gap-2 rounded-full text-[14px] sm:w-auto"
          >
            {status === "loading" ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Envoi…
              </>
            ) : status === "success" ? (
              <>
                <Check className="h-4 w-4" />
                Envoyé
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                Envoyer le message
              </>
            )}
          </Button>
        </form>
      </div>
    </section>
  );
}
