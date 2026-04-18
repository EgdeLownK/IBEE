---
paths:
  - "apps/dashboard/**"
  - "packages/ui-react/**"
---
# Règles apps/dashboard + ui-react

- Next.js 16 App Router, Server Components par défaut
- `'use client'` uniquement si : useState, useReducer, onClick, onChange, useEffect, useRouter client
- Ne jamais mettre de logique fetch dans un Client Component si un Server Component peut le faire
- Server Actions pour les mutations — jamais de route API `/api/*` (utiliser Route Handlers si nécessaire)
- Toute Server Action qui modifie une `entity` doit déclencher `purgeEntityCache(slug, siteUrl)`
- Icônes : `lucide-react`
- Toasts : `sonner` avec `<Toaster position="bottom-right" richColors />`
- Navigation : 2 niveaux — Rail principal (`/dashboard/*`) + Sidebar contextuelle (`/dashboard/site/*`)
- Composants interactifs → `@agora/ui-react`, composants statiques → `@agora/ui-server`
