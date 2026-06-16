# Déploiement Vercel — IBEE Platform

## Projet

- **Dashboard** : https://vercel.com/egdelownks-projects/platform
- **Production** : https://platform-egdelownks-projects.vercel.app
- **Root Directory** : `apps/platform` (obligatoire)
- **Framework Preset** : Next.js
- **Output Directory** : laisser vide (ne pas mettre `public`)
- **Repo GitHub** : `EgdeLownK/IBEE` (branche `main`)

> Si tu as aussi un projet Vercel **ibee** sur le même repo, applique les mêmes réglages
> ou désactive ses déploiements auto pour éviter un double build (un qui réussit, un qui échoue).

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

## Dépannage build Vercel

### `No Next.js version detected`

Le `package.json` **racine** du monorepo n’a pas `next` — seul `apps/platform/package.json` l’a.
Vercel cherche `next` dans le **Root Directory** configuré.

**Correction** (Settings → General → Root Directory) :

1. **Root Directory** → `apps/platform` (sans `/` au début, sans `\` Windows)
2. Sauvegarder, puis Settings → Build & Deployment :
   - **Framework Preset** → `Next.js`
   - **Install Command** (override) → `cd ../.. && pnpm install --frozen-lockfile`
   - **Build Command** (override) → `next build`
   - **Output Directory** → vide
3. Redeploy

Si l’erreur persiste dans l’UI : clique **Save** sur Root Directory, rafraîchis la page,
puis re-sélectionne Framework **Next.js**.

**Alternative** (build depuis la racine, comme avant) — Root Directory **vide** :

| Réglage | Valeur |
|---------|--------|
| Root Directory | *(vide)* |
| Framework | Other |
| Install Command | `pnpm install --frozen-lockfile` |
| Build Command | `pnpm --filter @ibee/platform build` |
| Output Directory | *(vide — pas `public`)* |

Préférer la config `apps/platform` + Next.js (première option).

### `No Output Directory named "public" found`

Le build Next.js a réussi (`✓ Generating static pages 36/36`) mais Vercel cherche un dossier
`public` comme pour un site statique — mauvaise config projet.

**Correction** (Settings → Build & Deployment) :

1. **Root Directory** → `apps/platform`
2. **Framework Preset** → `Next.js`
3. **Output Directory** → vide (désactiver l’override ; ne pas mettre `public`)
4. **Build Command** → vide ou `next build` (le `vercel.json` du dossier gère le reste)
5. Redeploy

### `NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY requis` (sitemap)

Ajouter les 3 variables d’environnement (section ci-dessus) sur le projet concerné, puis redeploy.
