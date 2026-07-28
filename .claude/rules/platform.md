---
paths:
  - "apps/platform/**"
  - "packages/ui-react/**"
---
# Règles apps/platform + ui-react

- Next.js 16 App Router, Server Components par défaut
- `'use client'` uniquement si : useState, useReducer, onClick, onChange, useEffect, useRouter client
- Ne jamais mettre de logique fetch dans un Client Component si un Server Component peut le faire
- Server Actions pour les mutations studio — Route Handlers pour les APIs visiteur (`/api/*`)
- Invalidation cache : `revalidatePath` via `revalidatePublicPaths` / `revalidateAfterEntityMutation` (Vercel)
- Icônes : `lucide-react`
- Toasts : `sonner` avec `<Toaster position="bottom-right" richColors />`
- Navigation : 2 niveaux — Rail principal (`/dashboard/*`) + Sidebar contextuelle (`/dashboard/site/*`)
- Composants interactifs → `@ibee/ui-react`, logique métier → `@ibee/shared`

## Doctrine des surfaces (post-migration Astro → Next)

| Surface | URL | Rôle |
|---------|-----|------|
| Public | `/{slug}`, pages détail, explore… | SSR/ISR SEO, interactions visiteur |
| Studio | `/dashboard/site` | Édition owner — Server Actions |
| Preview owner | `/{slug}?preview=1` | Aperçu public sans redirect studio |

- Owner sur `/{slug}` sans `?preview=1` → redirect `/dashboard/site`.
- Cache prod : `revalidatePath` (Vercel) — pas de purge Cloudflare.
- Invalidation : `revalidatePublicPaths` / `revalidateAfterEntityMutation` dans les mutations.
