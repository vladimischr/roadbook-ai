# Reel Instagram — Affiliation Roadbook AI

Reel animé 9:16 (1080×1920), 25 secondes, faceless. Brand voice Roadbook AI :
"tu", phrases courtes, aucun chiffre mirobolant aguicheur. Juste le mécanisme
clair : 30 % par filleul, c'est gratuit, voilà comment.

## 📁 Structure

```
affiliation-reel/
├── index.html        # Animation GSAP 25 s
├── voiceover.md      # Script ElevenLabs + timeline + réglages
└── README.md         # ce fichier
```

## 👀 Preview rapide

Ouvre `index.html` dans Chrome (double-clic). L'animation tourne en boucle automatiquement (reload à la fin pour rejouer).

**Plein écran propre** : F11 dans Chrome après ouverture, ou utilise le mode Device Toolbar pour forcer 1080×1920.

## 🎬 Les 5 scènes

| # | Temps | Contenu |
|---|---|---|
| **S1 — Hook** | 0 - 3.5 s | "Tu utilises Roadbook AI ? On te paye pour en parler." |
| **S2 — Le deal** | 3.5 - 9 s | **30 %** géant en italic Playfair + "de commission sur chaque abonnement que tu ramènes" |
| **S3 — 3 étapes** | 9 - 16 s | "01 Tu actives ton code · 02 Tu partages ton lien · 03 Tu touches ta part chaque mois" |
| **S4 — 3 promesses** | 16 - 21 s | "Gratuit. Sans engagement. Sans seuil." + "Même un compte Découverte peut parrainer" |
| **S5 — CTA** | 21 - 25 s | Dark mode + gold accent — "Ça prend un clic" + `getroadbook.com/affiliate` |

## 📹 Générer le MP4 (auto, 1 min)

Le script `render-mp4.mjs` utilise puppeteer + ffmpeg pour rendre l'animation
GSAP en MP4 H264 frame par frame (750 frames à 30 fps = 25 s).

### Première fois (install)
```bash
cd ~/Documents/GitHub/roadbook-ai/promo/affiliation-reel
npm install
```

### Render
```bash
npm run render
```

Sortie : `out/reel-affiliation.mp4` (~1 MB, 1080×1920, 30 fps, H264).

### Le MP4 généré
- **Format** : MP4 H264 (compatible IG / TikTok / LinkedIn / Twitter)
- **Résolution** : 1080×1920 (9:16)
- **Frame rate** : 30 fps
- **Durée** : 25 secondes
- **Bitrate** : ~340 kb/s (très léger, ~1 MB)
- **Audio** : pas de piste audio (ajoute le voice-over en post)

## 📝 Caption Instagram

```
Tu utilises Roadbook AI ?
On te donne 30 % de commission sur chaque abonnement que tu ramènes.

Comment ça marche :
1. Tu actives ton code en 1 clic depuis ton dashboard
2. Tu partages ton lien à tes confrères travel designers
3. Tu touches ta part chaque mois

C'est gratuit. Aucun engagement. Aucun seuil.
Même un compte Découverte peut parrainer — pas besoin d'être abonné toi-même.

Lien en bio.
```

## 🏷️ Hashtags (premier commentaire)

```
#traveldesigner #freelancevoyage #carnetdevoyage #voyagessurmesure #travelplanner #agencedevoyage #conciergerie #outilsfreelance #saas #affiliation #freelancefrance #entrepreneurfrance #voyageorganisé #travel #voyageaufeminin #luxuryvoyage #voyageorganisé #travelagency #digitalnomad #revenucomplementaire
```

## 🎵 Voice-over

Tout est dans `voiceover.md` :
- Script exact à coller dans ElevenLabs
- Réglages stabilité/clarity
- Timeline pour synchro audio + vidéo
- Suggestions musique de fond

## 📅 Heures de publication idéales

- **Mardi-jeudi 12h-14h** (pause déjeuner, audience B2B en scroll)
- **Dimanche 18h-20h** (prep semaine)

Évite lundi matin et soirs week-end.

## ✏️ Modifier le Reel

Tout est en HTML/CSS/GSAP. Pour changer un texte :

1. Édite `index.html`, section `<!-- SCÈNE X -->`
2. Reload Chrome pour preview
3. Re-screen-record

Pour changer la palette : modifie les variables CSS en haut du `<style>` (`--teal`, `--ink`, `--paper`).

## 🔁 Réutilisation cross-canal

| Canal | Adaptation |
|---|---|
| **TikTok** | MP4 identique, juste re-uploader. Caption : raccourcir |
| **YouTube Shorts** | MP4 identique |
| **LinkedIn** | MP4 25 s avec sous-titres incrustés (LinkedIn auto-play sans son) |
| **Twitter/X** | MP4 25 s, format identique |
| **Newsletter Resend** | GIF des scènes clés (S2 + S5) |

Penser sous-titres pour LinkedIn et Insta Reels muet (autoplay sans son par défaut).
