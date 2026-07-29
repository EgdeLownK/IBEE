# apps/platform — Next.js App Router (app unifiée)

App Next.js déployée sur Vercel. Surface **publique** (profils SEO, pages détail) + **studio owner** (`/dashboard/site`).

## Surfaces

| Zone | Routes | Rôle |
|------|--------|------|
| Public | `(public)/*`, `/api/*` | Visiteur, ISR, follow, commentaires, booking |
| Studio | `/dashboard/site/*` | Édition owner — Server Actions |
| Embed | `(embed)/profile-preview/*` | Aperçu Explore (iframe) |

## Frontière — où placer un nouveau fichier

- **Route publique** (page SEO visible aux visiteurs) → `src/app/(public)/`
- **Route studio owner** (édition, Server Actions) → `src/app/dashboard/site/`
  (mutations dans un fichier `*-actions.ts` du même dossier)
- **Route dashboard hors studio** (analytics, équipe, revenus, boutique,
  billetterie, favoris, messages, talent…) → `src/app/dashboard/` (racine ou
  sous-dossier dédié)
- **Route compte utilisateur** (mon-compte, candidatures) →
  `src/app/(account)/`
- **Route embed/iframe** → `src/app/(embed)/`
- **Endpoint HTTP visiteur** (webhook, API publique) → `src/app/api/`
  (garde-fous : `.claude/rules/api-security.md`)
- **Composant de page publique** → `src/components/public/`
- **Composant studio owner** → `src/components/profile/`
- **Composant dashboard hors studio** → `src/components/dashboard/`
- **Composant compte utilisateur** → `src/components/account/`
- **Client Supabase serveur** → `src/lib/supabase/server.ts` — logique
  serveur transverse (autre que Supabase) → `src/lib/`
- **Logique indépendante de Next.js/React** (calculs, validation,
  transforms réutilisables) → n'a pas sa place ici, direction
  `packages/shared` (voir `.claude/rules/shared.md`)
- **Composant réutilisable indépendant de la logique studio** (design
  system) → n'a pas sa place ici, direction `packages/ui-react`

## Packages

- `@ibee/ui-react` — composants React + design system
- `@ibee/shared` — logique wizards, widgets, validation
- `@ibee/supabase` — data layer

## Dev

```bash
pnpm dev   # depuis la racine → localhost:3000
```

Variables : `apps/platform/.env.local` en local (voir `apps/platform/.env.example` pour le template)
