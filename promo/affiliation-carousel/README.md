# Carrousel Instagram — Affiliation Roadbook AI

8 slides éditoriales en HTML/CSS, format 1080×1350 (4:5 IG), palette Émeraude,
typographies Playfair Display + Inter (cohérent avec le PDF Roadbook).

## 📁 Structure

```
affiliation-carousel/
├── slides/
│   ├── _shared.css        # styles partagés
│   ├── 01.html → 08.html  # 8 slides 1080×1350
├── preview.html           # vue d'ensemble (grille 4×2)
├── export.mjs             # script Playwright pour exporter en PNG
└── README.md              # ce fichier
```

## 👀 Preview rapide

Ouvre `preview.html` dans ton navigateur (double-clic depuis Finder). Tu vois
les 8 slides en grille, scalées à 25 %.

Pour voir une slide en taille réelle : ouvre `slides/01.html`, `02.html`, etc.

## 📸 Export en PNG (1080×1350)

### Option A — Script automatique (recommandé)

```bash
cd promo/affiliation-carousel
bun add -d playwright  # si pas déjà installé
npx playwright install chromium
node export.mjs
```

Résultat : `./out/slide-01.png` à `./out/slide-08.png` prêts à uploader.

### Option B — Screenshot manuel

1. Ouvre chaque slide HTML dans Chrome
2. DevTools (Cmd+Option+I) → onglet Device Toolbar (Cmd+Shift+M)
3. Custom size 1080×1350
4. Cmd+Shift+P → "Capture full size screenshot"
5. Renomme `slide-01.png` à `slide-08.png`

## 📤 Publication Instagram

1. Va dans IG → bouton **+** → **Publication**
2. Sélectionne les 8 PNG dans l'ordre (slide-01 puis 02 etc.)
3. Pas de filtre, ne crop pas
4. Colle la caption ci-dessous

## 📝 Caption à coller

```
Comment toucher 1 044 € en parlant d'un outil que tu utilises déjà.

Roadbook AI a ouvert son programme d'affiliation. Voici le deal :

→ Tu actives ton code en 1 clic depuis ton dashboard
→ Tu partages ton lien aux travel designers que tu connais
→ Tes filleuls profitent de -20 % sur leur premier mois
→ Tu touches 30 % de leur abonnement pendant 12 mois

Calcul concret :
- 3 filleuls Solo (29 €/mois) → 313 € sur l'année
- 10 filleuls Solo → 1 044 €
- 5 agences Atelier (99 €/mois) → 1 782 €

Conditions :
- Aucun engagement
- Aucun seuil de paiement
- Pause en 1 clic à tout moment
- Même un compte Découverte gratuit peut parrainer

Lien en bio pour activer ton code.
```

## 🏷️ Hashtags à coller en premier commentaire

```
#traveldesigner #freelancevoyage #carnetdevoyage #voyagessurmesure #agencedevoyage #travelagency #outilsfreelance #saas #affiliation #revenupassif #freelancefrance #entrepreneurfrance #digitalnomad #travel #voyageaufeminin #voyageorganisé #travelplanner #conciergerie #luxuryvoyage #voyagesurmesure
```

(20 hashtags = max IG. Pas tous évident-marketing pour rester crédible.)

## 📅 Heures de publication optimales

D'après les benchmarks 2026 pour audience pro francophone :

- **Mardi-jeudi** entre **12h-14h** (pause déjeuner, scroll feed)
- **Dimanche** entre **18h-20h** (préparation semaine)

Évite : lundi matin (semaine qui démarre, faible engagement) et week-end soir
(audience B2B décroche).

## 🔄 Réutilisation du contenu

Une fois publié sur IG, **recycle** :

| Canal | Adaptation |
|---|---|
| **LinkedIn** | Carrousel PDF natif → upload les 8 PNG en 1 doc PDF. Caption raccourcie + hashtags pro. |
| **Newsletter Resend** | Slide 1, 5 et 8 dans un mail. Lien CTA. |
| **Pinterest** | Slide 1 seule, format Pin (1000×1500), épingle vers /affiliation. |
| **TikTok / Reels** | Voir le script Reel #1 dans le doc séparé. |
| **DM personnel** | Template dans le doc séparé pour les 50 premiers users. |

## ✏️ Iter / modifier

Tout est en HTML/CSS pur. Pour changer un texte → édite le `.html` correspondant.
Pour changer la palette → édite `_shared.css` les variables `--teal`, `--ink`, `--paper`.

Si tu veux essayer une autre palette (Ocre, Bordeaux, etc.) : remplace dans
`_shared.css` :

- **Ocre** : `--teal: #A4571E; --teal-light: #C56F2D; --teal-soft: #F5EAD7;`
- **Minuit** : `--teal: #1B1F3A; --teal-light: #2C3458; --teal-soft: #E1E3EE;`
- **Bordeaux** : `--teal: #7B2C2C; --teal-light: #9C3E3E; --teal-soft: #F3DCDC;`
- **Cobalt** : `--teal: #2C4A8F; --teal-light: #3C5FA8; --teal-soft: #DEE5F1;`
