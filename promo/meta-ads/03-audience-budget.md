# Meta Ads — Audiences & budget strategy

## Ta stratégie audience (3 niveaux à tester)

### Niveau 1 — Audience interest-based (à utiliser MAINTENANT)

Tu n'as pas encore de data client. On commence par cibler les intérêts.

**Audience #1 : "Travel pros France"**
- Pays : `France`
- Âge : `28-55`
- Langue : `Français`
- Intérêts détaillés (OR) :
  - `Travel Industry`
  - `Travel Agency`
  - `Tourism`
  - `Vacation` (modérément, à exclure si trop large)
  - `Travel and tourism`
- Behaviors : `Small business owners`
- **Advantage+ Audience : ON** (Meta élargit auto si besoin)

Taille estimée : ~150k-300k personnes. Sweet spot pour 5€/jour.

### Niveau 2 — Lookalike (à activer après 50+ users free)

Une fois que tu as 50+ inscrits free, exporte leurs emails et crée :

**Audience #2 : "Lookalike Roadbook 1-3%"**
- Source : ta liste de free users (CSV upload)
- Pays : France
- % : 1-3% (1% = 240k personnes max, plus précis)

Cette audience convertit généralement **2-3× mieux** que l'interest-based.

### Niveau 3 — Retargeting (à activer après 1 mois)

**Audience #3 : "Site visitors 30j"**
- Source : Meta Pixel
- Inclus : tous les visiteurs de `getroadbook.com` derniers 30 jours
- Exclu : ceux qui ont fait `CompleteRegistration` (déjà signés)

Pour rappeler aux gens qui ont visité sans s'inscrire. ROAS très élevé.

### Audiences à NE PAS utiliser au début

❌ Cibler "Entrepreneurs" / "Freelance" — trop large, te coûtera 50€ par signup
❌ Cibler par âge 18-25 ou 60+ — pas le profil travel designer
❌ Multi-pays dès le départ — divise le budget et empêche l'optimisation

## Budget allocation (3 phases)

### Phase 1 — Test (jour 1-14) — 70€

| Ad set | Audience | Budget/j | Créa |
|---|---|---|---|
| AS1 | Interest "Travel pros France" | 2 € | Reel A |
| AS2 | Interest "Travel pros France" | 2 € | Carrousel B |
| AS3 | Interest "Travel pros France" | 1 € | Image C |

**Total : 5 €/jour × 14j = 70€**

Objectif : identifier le créa gagnant (cf. doc 02).

### Phase 2 — Scale (jour 15-30) — 100-150€

Garde le créa gagnant. Lance 2 ad sets en parallèle :
- AS gagnant (créa winner + interest audience) : 5€/jour
- AS lookalike (créa winner + lookalike 1-3%) : 5€/jour

**Total : 10€/jour × 15j = 150€**

### Phase 3 — Optimize (jour 30+) — 200-300€

Selon ce qui marche :
- Augmenter à 15€/jour le top ad set
- Ajouter retargeting (5€/jour)
- Tester un nouveau créa toutes les 3 semaines

## Le truc qu'on oublie : UTM tracking

Tous tes liens Ads Manager doivent avoir des UTM, sinon PostHog/Google Analytics ne sait pas que le trafic vient de Meta.

Pattern standard :

```
?utm_source=meta
&utm_medium=cpc
&utm_campaign={{campaign.name}}      # ex: affiliation_test
&utm_content={{ad.name}}             # ex: reel_mecanisme_a
&utm_term={{adset.name}}             # ex: travel_pros_fr
```

Tu peux mettre `{{campaign.name}}` etc. dans Ads Manager — Meta substitue auto.

**Comment vérifier dans PostHog** :
- PostHog → Insights → Trends
- Filter event = `signup_completed`
- Breakdown by property = `$initial_utm_source`
- Tu vois combien de signups viennent de `meta` vs `affiliate` vs `direct`

## Coût par acquisition cible (CAC)

Ton plan Solo est à **29€/mois**. Avec un trial 7 jours puis facturation, tu as :
- Revenu mensuel : 29€
- Revenu annuel (si rétention 12 mois) : 348€
- Marge brute : ~80% (340€ × 80% = 280€)

Tu peux donc te permettre un **CAC jusqu'à 100€ et c'est rentable en 4 mois**.

Cible early-stage **CAC < 30€** → ROI > 9× sur 12 mois. Si tu y arrives, tu peux scaler à 50-100€/jour sans souci.

## Si tu veux automatiser le reporting

PostHog peut te montrer le funnel complet par source :
- `meta_ad_click` (param URL utm) → `signup_completed` → `paywall_seen` → `checkout_started` → `subscription_active`

Setup un **insight Funnel** dans PostHog avec ces 5 events + breakdown par `utm_source`.

Tu sais en 1 clic combien chaque euro Meta a rapporté.

## Erreurs Meta Ads spécifiques B2B SaaS

- ❌ **Optimiser sur "Link Clicks"** au lieu de "Subscribe" → tu paies pour des curieux qui ne convertissent pas
- ❌ **Penser que les ads suffisent** → 80% de tes leads viennent du LinkedIn outbound. Les ads scalent ce qui marche déjà, ne créent pas le marché.
- ❌ **Lancer un Lundi** → Meta a besoin du WE pour learning. Lance plutôt Mardi.
- ❌ **Couper après 3 jours** "ça marche pas" → minimum 7 jours, idéalement 14 pour avoir un signal stable.

## Conclusion

Avec 5€/jour et 30 minutes par jour pour monitorer, tu peux générer **5-15 leads/mois** via Meta Ads (CAC ~20-30€).

Combiné à ton outbound LinkedIn (5 conversions/mois cible), tu as un funnel complet qui rampe à 10-25 paid users/mois sans doubler ton temps.
