# apps/platform — Next.js App Router (app unifiée)

App Next.js déployée sur Vercel. Surface **publique** (profils SEO, pages détail) + **studio owner** (`/dashboard/site`).

## Surfaces

| Zone | Routes | Rôle |
|------|--------|------|
| Public | `(public)/*`, `/api/*` | Visiteur, ISR, follow, commentaires, booking |
| Studio | `/dashboard/site/*` | Édition owner — Server Actions |
| Embed | `(embed)/profile-preview/*` | Aperçu Explore (iframe) |

## Structure

- `src/app/(public)/` — pages publiques SEO
- `src/app/dashboard/site/` — studio owner + `*-actions.ts`
- `src/components/public/` — composants pages publiques
- `src/components/profile/` — studio owner
- `src/lib/supabase/server.ts` — client Supabase serveur

## Packages

- `@ibee/ui-react` — composants React + design system
- `@ibee/shared` — logique wizards, widgets, validation
- `@ibee/supabase` — data layer

## Dev

```bash
pnpm dev   # depuis la racine → localhost:3000
```

Variables : voir `apps/platform/.env.example`
