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

## 📹 Exporter en MP4 (3 options)

### Option A — QuickTime Screen Recording (le plus simple, 2 min)

1. Ouvre `index.html` dans Chrome
2. Mets en plein écran : **Cmd+Shift+F** (ou F11)
3. Lance **QuickTime Player** → Fichier → **Nouvel enregistrement d'écran**
4. Sélectionne la zone du Reel (1080×1920 sur ton écran selon ta résolution)
5. Clique **Démarrer l'enregistrement**, attends 1 sec, reload Chrome (Cmd+R) pour relancer l'animation
6. Attends 25 secondes, stop
7. Crop dans QuickTime ou iMovie pour avoir exactement 9:16

### Option B — Pipeline Hyperframes existant

Tu as déjà un système pour render HTML → MP4 (cf. Reel IG Solo Pain #001).
Pointe-le sur ce HTML et laisse-le rendre.

### Option C — Playwright + ffmpeg (auto)

Si tu veux un script reproductible :

```bash
cd ~/Documents/GitHub/roadbook-ai/promo/affiliation-reel
# Une fois installé Playwright + ffmpeg
node export-mp4.mjs  # à coder si besoin
```

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
