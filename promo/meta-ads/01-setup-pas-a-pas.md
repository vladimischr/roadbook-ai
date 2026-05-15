# Meta Ads — Setup pas à pas (60 min total)

> Guide complet pour lancer la 1ère campagne Meta Ads test 5€/jour pour Roadbook AI.
> Le code (Pixel + Conversions API) est déjà intégré côté Roadbook AI — il te reste
> à brancher 4 env vars + créer la campagne.

## Phase 1 — Compte & infrastructure (30 min)

### A. Business Manager (5 min)

1. Va sur **https://business.facebook.com/**
2. Si tu n'en as pas, clique **Créer un compte** :
   - Nom : `Roadbook AI`
   - Ton nom + ton email pro `vladimir@brakial.com`
3. Pages : **Ajouter une page** → choisis ou crée la page Instagram/Facebook Roadbook AI
4. Comptes publicitaires : **Ajouter un compte publicitaire** → en créer un nouveau
   - Nom : `Roadbook AI - Acquisition`
   - Fuseau : `Europe/Paris`
   - Devise : `EUR`
5. Méthode de paiement → ajoute ta CB (pas de débit avant que la campagne ne tourne)

### B. Page Facebook business (si pas déjà fait, 5 min)

Meta Ads exige une page Facebook (même si tu ne postes que sur Instagram).

1. **facebook.com/pages/create** → **Entreprise/marque** → `Roadbook AI`
2. Catégorie : `Logiciel`
3. Description courte : `SaaS de carnet de voyage pour travel designers`
4. Photo profil : logo Roadbook
5. Photo couverture : un de tes carrousels affiliation

Lie la page au Business Manager.

### C. Compte Instagram pro lié (5 min)

1. Sur l'app IG, settings → **Compte professionnel**
2. Lie à la page Facebook créée
3. Dans Business Manager → **Paramètres de l'entreprise → Comptes → Comptes Instagram** → ajoute

### D. Meta Pixel (10 min)

1. Va sur **https://business.facebook.com/events_manager2/**
2. **Data Sources → Connecter des données → Web**
3. Source name : `Roadbook AI Production`
4. Method : **Conversions API and Meta Pixel** (les 2)
5. URL de site : `https://getroadbook.com`
6. Copie le **Pixel ID** (15-16 chiffres) → tu en as besoin pour env var
7. **Settings → Generate access token** → copie le **Access Token CAPI** (`EAAxxxxxxx...`)

### E. Domaine vérifié (5 min — important pour iOS 14.5+)

1. Events Manager → **Settings → Domains → Add Domain**
2. Entre `getroadbook.com`
3. **Choisis "Meta-tag verification"** → copie le `<meta name="facebook-domain-verification" content="abc123xyz...">`
4. À ajouter dans `__root.tsx` (cf. section "Code à ajouter" ci-dessous)
5. Re-déploie Lovable
6. Reviens cocher **Verify**
7. **Aggregated Event Measurement → Configure Web Events** → priorise tes events dans l'ordre :
   1. `Subscribe` (le plus important, optimisation campagne)
   2. `InitiateCheckout`
   3. `CompleteRegistration`
   4. `Lead`
   5. `PageView`

## Phase 2 — Env vars à brancher (5 min)

Va dans **Lovable → Cloud → Secrets** et ajoute :

| Secret | Valeur | Où ? |
|---|---|---|
| `VITE_META_PIXEL_ID` | `123456789012345` (15-16 chiffres) | Pixel ID copié à l'étape D6 |
| `META_PIXEL_ID` | (idem, sans le `VITE_`) | Pour le serveur CAPI |
| `META_CAPI_ACCESS_TOKEN` | `EAAxxxxxxx...` (long token) | Token copié à l'étape D7 |
| `META_CAPI_TEST_CODE` | (laisse vide en prod) | Optionnel pour tester |

⚠️ `VITE_META_PIXEL_ID` est exposé côté client (c'est OK, le Pixel ID est public). `META_CAPI_ACCESS_TOKEN` est server-only et **ne doit jamais** apparaître côté client.

Re-déploie Lovable. Le Pixel est maintenant actif sur tout le site.

## Phase 3 — Code à ajouter (5 min)

### Meta domain verification meta tag

Édite `src/routes/__root.tsx`, section `meta:` :

```ts
{ name: "facebook-domain-verification", content: "abc123xyz..." }, // ← colle ta valeur
```

Commit + push + Lovable Publish.

## Phase 4 — Vérifier que le Pixel fonctionne (10 min)

1. Installe l'extension Chrome **"Meta Pixel Helper"** : https://chrome.google.com/webstore/detail/meta-pixel-helper/fdgfkebogiimcoedlicjlajpkdmockpc
2. Ouvre **getroadbook.com** dans Chrome
3. Clique l'icône Pixel Helper en haut à droite → tu dois voir :
   - ✅ Pixel actif (1 pixel détecté)
   - ✅ Event PageView fired
4. Inscris-toi avec un email test → tu dois voir l'event `CompleteRegistration` fire
5. Va sur Events Manager → **Test Events** → tu dois voir les events arriver en quasi temps réel (côté Pixel ET côté CAPI dédupliqués)

## Phase 5 — 1ère campagne test 5€/jour (10 min)

### Structure recommandée (Advantage+ Shopping campaign)

1. Ads Manager → **+ Create**
2. **Objectif : Sales** (Meta optimise pour l'event Subscribe que tu as priorisé)
3. **Campagne type : Advantage+ Shopping** (Meta gère l'audience auto avec IA — meilleur ROI early)
4. Budget : **5 €/jour** ad set, **Daily budget** (pas Lifetime au début)
5. Durée : laisse running, on évaluera à 14 jours
6. **Performance goal** : `Maximize conversions` → event `Subscribe` (le plus rare = optimisation correcte)
7. **Audience** :
   - Pays : France (uniquement au début, on élargira si ça marche)
   - Âge : 28-55
   - Détaillé : `Travel Industry` OR `Tourism` OR `Travel Agency` (intérêts pro)
   - Advantage+ Audience : ON (laisse Meta élargir l'audience)
8. **Placements** : Advantage+ (Auto) — Meta choisit IG, FB, Audience Network
9. **Identités** : ta page FB + compte IG Roadbook AI

### Le créa initial

- **Type** : Single video
- **Vidéo** : Upload ton **Reel affiliation MP4** (`~/Downloads/reel-affiliation-roadbook.mp4`)
- **Caption courte** : `Tu utilises Roadbook AI ? On te donne 30 % de commission sur chaque abonnement filleul. Active ton code en 1 clic.`
- **CTA** : `Learn more` → URL : `https://getroadbook.com/affiliation?utm_source=meta&utm_medium=cpc&utm_campaign=affiliation_test`

### Publier

1. **Review** → vérifie tout
2. **Publish**
3. Meta prend 24-48h pour passer en learning phase. Pas de panique si les premiers chiffres sont étranges.

## Phase 6 — Suivi à J7 et J14

### Métriques à regarder dans Ads Manager

| Métrique | Bonne valeur (early, France, B2B) |
|---|---|
| **CPM** (coût pour 1000 impressions) | 5-15 € |
| **CTR** (click-through rate) | > 1.5 % |
| **CPC** (cost per click) | < 1 € |
| **Cost per Lead/Registration** | < 5 € |
| **Cost per Subscribe** (conversion finale) | < 30 € (objectif) |

### Si après 14 jours / 70€ dépensés :

- **0-1 conversion** : créa pas assez accrocheur ou audience mal ciblée. Pivote.
- **2-5 conversions** : tu es sur la bonne voie. Augmente à 10 €/jour pour scaler.
- **5+ conversions** : c'est qu'il y a un signal. Duplique l'ad set, change le créa, A/B test.

### Si Meta ne diffuse pas (impressions = 0 après 48h)

- Vérifie le statut du paiement (CB rejetée ?)
- Vérifie que la page est publique (pas en mode privé)
- Vérifie que le créa n'a pas été refusé pour règlement (politique d'usage)

## Erreurs fréquentes

- ❌ **Lancer plusieurs campagnes en même temps** → Meta a besoin de signal pour apprendre, divise par 3 ne diffuse rien correctement
- ❌ **Changer le créa tous les 3 jours** → bloque le learning phase
- ❌ **Optimiser sur "Link Clicks" au lieu de "Subscribe"** → tu paies pour du trafic non qualifié
- ❌ **Budget trop bas (< 3€/jour)** → Meta n'a pas assez de marge pour optimiser
- ❌ **Audience trop large dès le départ** (multi-pays, intérêts génériques) → impossible de savoir ce qui marche

## Ce qui marche en 2026 (vs 2022 où tout marchait)

- ✅ **Advantage+** campaigns (Meta IA decide audience + creative + placement)
- ✅ **Video-first** (les images stat convertissent 50% moins qu'en 2022)
- ✅ **Court (< 30s)** avec hook fort dans les 2 premières secondes
- ✅ **Sous-titres incrustés** (85% des reels sont vus sans son)
- ✅ **CAPI activée** (sinon iOS 14.5+ casse 30% de l'attribution)
