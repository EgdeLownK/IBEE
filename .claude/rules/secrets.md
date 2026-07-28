---
paths:
  - "apps/platform/.env.example"
  - "apps/platform/src/app/api/**"
---
# Secrets & topologie des environnements

Référence des clés attendues : `apps/platform/.env.example` (versionné, un
seul fichier d'env côté app — `apps/platform/.env.local` en local).

- **`SUPABASE_SERVICE_ROLE_KEY` et tout secret à privilèges étendus** :
  jamais de préfixe `NEXT_PUBLIC_`, jamais exposé côté client.
- **`STRIPE_WEBHOOK_SECRET`, `STRIPE_SECRET_KEY`, `CRON_SECRET`,
  `RESEND_API_KEY`, `BOOKING_EMAIL_SECRET`** : server-only, vérifiés présents
  dans `apps/platform/.env.example`.

## Topologie Vercel Preview vs Production

Ce qui suit décrit une politique de configuration (comment les secrets
Vercel doivent être scopés), pas un fait vérifiable dans ce dépôt — aucun
outil CLI/MCP Vercel n'est disponible pour la relire depuis le code. À
traiter comme une consigne à respecter, pas comme un état confirmé.

- `NEXT_PUBLIC_SUPABASE_URL`/`NEXT_PUBLIC_SUPABASE_ANON_KEY`/`NEXT_PUBLIC_WEB_URL` : mêmes valeurs en Production et Preview (données publiques, même projet Supabase).
- `STRIPE_SECRET_KEY` en Preview : uniquement une clé mode test (`sk_test_...`), jamais la clé live — un environnement preview est accessible par URL à quiconque la connaît.
- `SUPABASE_SERVICE_ROLE_KEY` : Production uniquement, jamais en Preview — cette clé contourne RLS entièrement. Conséquence acceptée : une feature qui en dépend (ex. cron analytics) échoue proprement en preview, ce n'est pas un bug à corriger.
