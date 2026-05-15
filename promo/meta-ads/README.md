# Meta Ads — Setup Roadbook AI

> Stack complet pour lancer la 1ère campagne Meta Ads test 5€/jour.

## 📁 Structure

```
meta-ads/
├── 01-setup-pas-a-pas.md      # Setup Business Manager + Pixel + CAPI (60 min)
├── 02-creas-3-variantes.md    # 3 créas A/B/C à tester
├── 03-audience-budget.md      # Audiences + budget + scaling
├── creas/
│   ├── image-comparison.html  # Variante C : image statique 1080×1080
│   └── out/
│       └── image-comparison.png  # Image générée (PNG)
└── README.md                   # ce fichier
```

## ✅ Ce qui est déjà fait (côté code Roadbook AI)

- **Meta Pixel** intégré dans `__root.tsx` (auto-load au premier render)
- **Meta Conversions API** server-side dans `lib/meta-capi.server.ts`
- **API relay** `/api/meta-capi-track` pour dédup Pixel ↔ CAPI via `event_id`
- **Events trackés** :
  - `PageView` (auto sur chaque navigation)
  - `CompleteRegistration` (signup, déjà câblé dans `login.tsx`)
  - `InitiateCheckout` (au moment de la redirection Stripe, dans `useSubscription.ts`)
  - `Subscribe` (côté serveur quand paiement confirmé, dans `stripe-webhook.ts`)

## ⏳ Ce qu'il te reste à faire (~70 min)

1. **Lire `01-setup-pas-a-pas.md`** → suivre les étapes (Phase 1-5)
2. **Brancher 4 env vars** dans Lovable Secrets :
   - `VITE_META_PIXEL_ID` (client)
   - `META_PIXEL_ID` (server, même valeur)
   - `META_CAPI_ACCESS_TOKEN` (server, jamais côté client)
   - `META_CAPI_TEST_CODE` (optionnel, pour debug)
3. **Ajouter la meta-tag de vérification** de domaine dans `__root.tsx`
4. **Lovable Publish**
5. **Vérifier le Pixel** avec l'extension Chrome "Meta Pixel Helper"
6. **Créer la 1ère campagne** dans Ads Manager (cf. doc 02)
7. **Uploader les 3 créas** (Reel + Carrousel + Image)
8. **Lancer** mardi matin

## 🎯 Objectifs réalistes early-stage B2B SaaS

| Métrique | Objectif J14 (70€ dépensés) |
|---|---|
| Impressions | 5 000 - 15 000 |
| Clicks | 75 - 200 |
| Free signups | 8 - 20 |
| Subscriptions payantes | 2 - 5 |
| CAC (Subscriptions) | < 30 € |

Si tu hits ces objectifs → tu peux scaler à 10-20€/jour sans risque.

## 🔗 Liens utiles

- Business Manager : https://business.facebook.com
- Events Manager : https://business.facebook.com/events_manager2
- Ads Manager : https://business.facebook.com/adsmanager
- Pixel Helper extension : https://chrome.google.com/webstore/detail/meta-pixel-helper/fdgfkebogiimcoedlicjlajpkdmockpc
- Documentation Pixel : https://developers.facebook.com/docs/meta-pixel
- Documentation CAPI : https://developers.facebook.com/docs/marketing-api/conversions-api
