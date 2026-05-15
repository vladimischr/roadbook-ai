# Meta Ads — 3 créas variantes (test A/B/C)

> Stratégie : tester 3 angles différents sur la même audience pendant 14 jours,
> 2-3€/jour chacun. Au bout, garde le gagnant + budget × 3.

## Pourquoi 3 variantes

Le **créa fait 80% de la performance** d'une campagne Meta Ads en 2026 (Meta IA optimise tout le reste). Au lieu de tester 5 audiences avec 1 créa, tu testes 3 créas sur 1 audience.

## ✅ Variante A — Reel "Mécanisme" (déjà produit)

**Fichier** : `~/Downloads/reel-affiliation-roadbook.mp4` (1080×1920, 25s)

**Angle** : explication directe — "30%, c'est gratuit, voilà comment"

**Caption Ads Manager (à coller)** :

```
Tu utilises Roadbook AI ?

On te donne 30 % de commission sur chaque abonnement que tu ramènes. Pendant 12 mois.

C'est gratuit. Aucun engagement.
Active ton code en 1 clic.
```

**CTA** : `Learn more` → `https://getroadbook.com/affiliation?utm_source=meta&utm_medium=cpc&utm_campaign=affiliation_test&utm_content=reel_mecanisme`

## ✅ Variante B — Carrousel "Storytelling" (à créer à partir du carrousel existant)

**Fichier source** : `~/Documents/GitHub/roadbook-ai/promo/affiliation-carousel/out/` (8 PNG)

**Quoi changer pour Meta Ads** :
- Meta Ads accepte les carrousels jusqu'à 10 cards
- Tu peux uploader les 8 PNG comme un carrousel ad
- **OU** version condensée : prends slide 01 (cover), 05 (scénarios), 06 (étapes), 08 (CTA) seulement = 4 cards

**Angle** : preuve sociale + chiffres concrets

**Caption Ads Manager** :

```
Pourquoi on donne 30 % à ceux qui parlent de Roadbook AI ?

Parce qu'une reco de confrère vaut 100x une pub.

Au lieu de cramer ton budget Meta, je préfère payer les travel designers qui font le vrai travail : parler à leur réseau.

Lien en bio pour activer ton code.
```

**CTA** : `Learn more` → `https://getroadbook.com/affiliation?utm_source=meta&utm_medium=cpc&utm_campaign=affiliation_test&utm_content=carousel_story`

## ✅ Variante C — Image statique "Comparaison" (à coder)

**Format** : Single image 1080×1080 (carré, optimal pour feed et placements multiples)

**Concept visuel** :
- Fond crème éditorial
- Split en 2 colonnes : "Sans Roadbook AI" / "Avec Roadbook AI"
- Colonne 1 : PDF Word générique (illustré sobrement)
- Colonne 2 : PDF éditorial premium
- Au-dessus : grosse phrase "Pourquoi ton livrable client te dessert."

Je code maintenant l'HTML statique → tu screen-shot en 1080×1080.

**Angle** : product-led (problème → solution)

**Caption Ads Manager** :

```
Ton client paie 5 000 € pour un voyage sur mesure.

Tu lui envoies un PDF Word.

Roadbook AI génère le carnet éditorial qui mérite ton expertise. En 5 minutes.

Essai gratuit, lien en bio.
```

**CTA** : `Try free` → `https://getroadbook.com?utm_source=meta&utm_medium=cpc&utm_campaign=affiliation_test&utm_content=image_comparison`

---

## Tableau de répartition budget pendant le test (14 jours)

| Variante | Budget/jour | Total 14j | Format |
|---|---|---|---|
| A — Reel mécanisme | 2 € | 28 € | Video 9:16 |
| B — Carrousel story | 2 € | 28 € | Carousel 8 cards |
| C — Image comparaison | 1 € | 14 € | Image 1:1 |
| **Total** | **5 €/j** | **70 €** | |

## Décision à J14

| Résultat | Action |
|---|---|
| 1 variante avec coût/Subscribe < 30 € | Pause les 2 autres, scale celle-là à 10€/jour |
| 2 variantes égales | Continue les 2, augmente budget total à 8€/jour |
| Aucune ne convertit | Pivot angle (ex: cibler agences boutique au lieu de freelances) |

## Variante D (bonus si budget) — Lookalike custom

Une fois que tu as **50+ users free signup**, tu peux créer une audience lookalike :

1. Events Manager → **Custom audiences → Create → Customer file**
2. Upload les emails des 50 free users (CSV)
3. Crée une **Lookalike 1-3%** (3% = plus large, 1% = plus précis)
4. Ad set dédié avec cette audience + un des créas qui marche
5. Budget 5€/jour additionnel

C'est généralement **2-3x plus performant** que l'audience interest-based.

---

## Variante C — Code de l'image statique

Je le code dans `creas/image-comparison.html`. À ouvrir dans Chrome, screenshot 1080×1080.
