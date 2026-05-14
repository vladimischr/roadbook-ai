# PostHog Instrumentation — Kit prêt-à-coller

> **But** : instrumenter le funnel signup → utilisateur payant sur Roadbook AI.
> Sans data, toute optimisation est à l'aveugle.
>
> **Statut** : Kit complet, prêt à intégrer dans `src/lib/` et 5 fichiers de routes.

---

## ⚙️ Étape 1 — Compte PostHog (5 min)

1. Va sur [eu.posthog.com](https://eu.posthog.com) (instance EU, RGPD-friendly).
2. Crée un compte gratuit (1M events/mois gratis — largement assez en early stage).
3. Crée un projet "Roadbook AI".
4. Récupère ta **Project API Key** (format `phc_xxxxxxxxxxxx`).

Ajoute dans ton `.env.local` :
```bash
VITE_POSTHOG_KEY=phc_xxxxxxxxxxxx
VITE_POSTHOG_HOST=https://eu.i.posthog.com
```

Sur Cloudflare (prod), ajoute les mêmes vars dans `wrangler.jsonc` ou via le dashboard Cloudflare Pages > Settings > Environment variables.

---

## 📦 Étape 2 — Install dependency (1 min)

```bash
bun add posthog-js
```

---

## 📁 Étape 3 — Copier les 2 fichiers du kit (1 min)

Copier dans `src/lib/` :

```
posthog-setup/src/analytics.ts      →  src/lib/analytics.ts
posthog-setup/src/posthog-init.ts   →  src/lib/posthog-init.ts
```

C'est tout. **Pas de Provider React à wrap** — l'init se fait automatiquement au premier import (`if typeof window !== "undefined"`).

---

## 🔌 Étape 4 — Brancher les 8 événements (30 min)

> Tous les patches sont autonomes et non-destructifs. Tu peux les appliquer un par un.

### 4.1 Identify l'user au login (login.tsx + useSubscription)

**Pourquoi** : sans identify, PostHog ne lie pas les events à un user_id, et le funnel est cassé.

**Où** : dans le hook `useSubscription` (ou équivalent qui te donne l'utilisateur authentifié). Idéalement après que le client Lovable Cloud Auth ait résolu l'user.

```tsx
// src/lib/useSubscription.ts (extrait, à adapter à ton fichier)
import { useEffect } from "react";
import { identifyUser, resetUser } from "@/lib/analytics";

// Dans le hook useSubscription, après que `user` est connu :
useEffect(() => {
  if (user?.id) {
    identifyUser(user.id, {
      email: user.email,
      plan_key: info?.plan_key,
      subscription_status: info?.status,
      created_at: user.created_at,
    });
  } else {
    resetUser();
  }
}, [user?.id, info?.plan_key, info?.status]);
```

### 4.2 `signup_completed` (login.tsx)

**Où** : dans le callback après création de compte réussie.

```tsx
// src/routes/login.tsx (extrait)
import { track } from "@/lib/analytics";

// Après le signup réussi :
track("signup_completed", {
  method: "email", // ou "google", "magic_link" selon la méthode utilisée
  plan_key: "free",
});
```

### 4.3 `first_roadbook_started` (new.tsx)

**Où** : au mount de la route `/new` OU au premier "Suivant" du wizard.

```tsx
// src/routes/new.tsx (extrait)
import { useEffect } from "react";
import { track } from "@/lib/analytics";

// Dans le composant New :
useEffect(() => {
  track("first_roadbook_started", {
    source: "blank", // ou "import_excel" / "import_notion" selon le flow
  });
}, []);
```

### 4.4 `first_roadbook_completed` (new.tsx OU brief.$token.tsx)

**Où** : quand le roadbook a une cover + ≥3 jours + au moins 1 export.

```tsx
// Au moment de la validation finale du roadbook :
track("first_roadbook_completed", {
  roadbook_id: roadbook.id,
  destination: roadbook.destination,
  days_count: roadbook.days.length,
});
```

### 4.5 `pdf_exported` (brief.$token.tsx ou route /api/export-pdf)

```tsx
// Au clic sur "Exporter en PDF" :
track("pdf_exported", {
  roadbook_id: roadbook.id,
  destination: roadbook.destination,
  days_count: roadbook.days.length,
  export_type: hasWatermark ? "pdf_watermarked" : "pdf_clean",
});
```

### 4.6 `roadbook_shared` (composant Share, où qu'il soit)

```tsx
// Au clic "Copier le lien" ou "Envoyer par email" :
track("roadbook_shared", {
  roadbook_id: roadbook.id,
  destination: roadbook.destination,
  days_count: roadbook.days.length,
  channel: "copy_url", // ou "email" / "link"
});
```

### 4.7 `paywall_seen` (Paywall.tsx)

**Où** : dans le composant `Paywall`, au mount.

```tsx
// src/components/Paywall.tsx (extrait)
import { useEffect } from "react";
import { track } from "@/lib/analytics";

// Dans le composant Paywall (paywall ouvert) :
useEffect(() => {
  if (paywallOpen) {
    track("paywall_seen", {
      trigger: trigger, // "quota_reached" / "premium_feature" / "manual_open"
      current_plan: info?.plan_key ?? "free",
    });
  }
}, [paywallOpen, trigger, info?.plan_key]);
```

### 4.8 `checkout_started` (Paywall.tsx ou billing.tsx)

**Où** : juste avant la redirection vers Stripe Checkout.

```tsx
// Avant `redirectToStripe(...)` :
track("checkout_started", {
  target_plan: selectedPlan, // ex: "solo"
  billing: selectedBilling, // "monthly" ou "annual"
});
```

### 4.9 `subscription_active` (api/stripe-webhook ou api/stripe-resync)

**Où** : côté serveur, quand Stripe confirme l'abonnement (webhook `checkout.session.completed` ou `customer.subscription.created`).

⚠️ Côté serveur, posthog-js n'est pas optimal — utilise `posthog-node` ou un simple `fetch` vers l'API de capture :

```ts
// src/routes/api/stripe-webhook.ts (extrait)
async function capturePosthogEvent(distinctId: string, plan: string, billing: string, amountCents: number) {
  await fetch(`${process.env.POSTHOG_HOST ?? "https://eu.i.posthog.com"}/i/v0/e/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: process.env.POSTHOG_KEY,
      event: "subscription_active",
      distinct_id: distinctId,
      properties: { plan_key: plan, billing, amount_cents: amountCents },
    }),
  });
}
```

→ Et dans le handler du webhook, appelle `capturePosthogEvent(userId, plan, billing, amount)` après la mise à jour Supabase.

> Note : tu devras créer un secret Cloudflare `POSTHOG_KEY` distinct de la clé publique frontend si tu veux séparer (recommandé).

---

## 🧪 Étape 5 — Vérifier que ça marche

1. Lance le projet en local : `bun dev`
2. Mets `VITE_POSTHOG_DEBUG=true` dans `.env.local` pour activer les logs en dev
3. Ouvre la console du navigateur
4. Crée un compte test → tu dois voir `[analytics] signup_completed` etc.
5. En prod (sans `VITE_POSTHOG_DEBUG`), les events partent vers PostHog
6. Va sur posthog.com → "Events" → tu vois les events arriver en quasi-temps réel

---

## 📊 Étape 6 — Construire les funnels dans PostHog (15 min)

Une fois 50+ events reçus :

### Funnel principal : Signup → Payant
```
1. signup_completed
2. first_roadbook_started  (cible : 80% des signups en 7j)
3. first_roadbook_completed (cible : 40% des signups en 7j ← Day 7 metric)
4. paywall_seen
5. checkout_started
6. subscription_active (cible : 5-15% des signups en 30j)
```

Crée le funnel dans PostHog : New funnel → ajoute les 6 events → save.

### Funnel d'export (preuve d'usage actif)
```
1. first_roadbook_completed
2. pdf_exported
3. roadbook_shared
```

→ Les users qui exportent ET partagent sont les plus rentables / les plus rétentifs.

### Cohortes utiles à créer
- **Activés** : a `first_roadbook_completed` dans les 7j post-signup
- **Engagés** : 3+ `pdf_exported` dans les 30j
- **À risque** : signup il y a 14j, pas de `first_roadbook_completed`

---

## 🎯 Métriques à monitorer chaque lundi

| KPI | Source | Cible MVP |
|---|---|---|
| Activation J7 | Funnel `signup → first_roadbook_completed` | >40% |
| Conversion free→paid J30 | Funnel `signup → subscription_active` | >5% |
| Time to first roadbook | Median delta J0 → first_roadbook_completed | <30 min |
| Paywall conversion | `checkout_started / paywall_seen` | >15% |
| Checkout conversion | `subscription_active / checkout_started` | >70% |

---

## 🔒 Considérations RGPD

- Instance EU (eu.posthog.com) → données restent en Europe
- `respect_dnt: true` → respecte Do Not Track navigateur
- Session recording **désactivé** par défaut
- Ajouter une ligne dans ta page Confidentialité : *"Nous utilisons PostHog (analyse produit) pour comprendre comment les utilisateurs naviguent dans l'application. Les données sont anonymisées et stockées en Europe."*
- Configurer le **cookie banner** pour permettre opt-out (à faire avec ton composant de cookies)

---

## 🆘 Si quelque chose foire

1. **Pas d'events qui arrivent en prod** → vérifier que `VITE_POSTHOG_KEY` est bien défini dans Cloudflare Pages env vars
2. **Events doublés** → l'initPostHog devrait protéger via `initialized`. Si doublons, check qu'un seul fichier importe `analytics.ts` au boot
3. **PostHog bloque ton dashboard local** → mets `VITE_POSTHOG_DEBUG=false` ou supprime la var → tout est skip en dev
4. **Adblock chez certains users** → normal, c'est compté ~10-20% sur la perte d'events. PostHog propose un reverse proxy si critique (plus tard)

---

## 🛣️ Prochaines étapes (après instrumentation)

Une fois 1 semaine de data collectée :
1. **Identifier l'aha moment réel** (corrélation : quelle action prédit le mieux la conversion ?)
2. **A/B tester** via PostHog Feature Flags (gratuit) → ex : pricing Solo 29€ vs 39€
3. **Implémenter Reverse Trial 14j** → re-mesurer le funnel
4. **Itérer** la pricing page selon les bounces

Voir [[strategie-roadbook-utilisateurs-payants]] dans le second brain pour le plan 90j complet.
