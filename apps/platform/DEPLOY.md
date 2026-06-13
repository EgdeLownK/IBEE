# Déploiement Vercel — IBEE Platform

## Projet

- **Dashboard** : https://vercel.com/egdelownks-projects/platform
- **Production** : https://platform-egdelownks-projects.vercel.app
- **Root Directory** : `apps/platform`
- **Repo GitHub** : `EgdeLownK/IBEE` (branche `main`)

## Variables d'environnement (déjà configurées sur Vercel)

| Variable | Environnements |
|----------|----------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Production, Preview, Development |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Production, Preview, Development |
| `NEXT_PUBLIC_WEB_URL` | Production, Preview, Development → URL prod Vercel |

Après cutover DNS (`ibee.fr`), mettre à jour `NEXT_PUBLIC_WEB_URL` vers `https://ibee.fr`.

## Déployer

Chaque push sur `main` déclenche un déploiement production (Git connecté).

```bash
# Depuis la racine du monorepo
git push origin main
```

Preview automatique sur chaque PR.

## Dev local

```bash
pnpm dev          # localhost:3000
pnpm build        # build @ibee/platform
```

Copier `apps/platform/.env.example` → `apps/platform/.env.local`.

## CLI (optionnel)

```bash
cd apps/platform
npx vercel env pull .env.local
npx vercel deploy --prod   # depuis la racine du monorepo si .vercel/project.json pointe sur platform
```
