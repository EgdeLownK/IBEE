---
paths:
  - "apps/platform/src/app/api/**"
---
# Sécurité API (Route Handlers)

- **Webhook Stripe : vérifier la signature HMAC avant tout traitement.**
  `stripe.webhooks.constructEvent(body, signature, STRIPE_WEBHOOK_SECRET)` —
  voir `apps/platform/src/app/api/checkout/webhook/route.ts`. Ne jamais
  traiter un event Stripe qui n'a pas passé cette vérification.
- **Identité côté serveur uniquement** : `auth.getUser()` dans chaque route,
  jamais un ID transmis par le client comme source de vérité (voir
  `.claude/rules/database.md`).
- **Upload de fichiers : uniquement via Server Action, jamais depuis le
  client** — valider type MIME et taille AVANT l'upload (voir
  `apps/platform/src/app/dashboard/site/entity-profile-actions.ts` pour le
  pattern). Note : les uploads vivent dans des Server Actions hors
  `app/api/**` — cette règle ne se déclenche donc pas automatiquement sur ces
  fichiers, seulement sur les Route Handlers de ce périmètre.
