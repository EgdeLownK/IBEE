---
paths:
  - "apps/web/**"
  - "packages/ui-server/**"
---
# Règles apps/web + ui-server

- Astro 6 SSR, adapter Cloudflare, **zéro JS client** sur les pages profil
- Aucun import depuis `@agora/ui-react` — uniquement `@agora/ui-server`
- Exception JS documentée : `/explore` (recherche live, vanilla JS inline, noindex)
- Toute nouvelle exception JS doit être justifiée en commentaire au-dessus de l'import
- Sémantique HTML stricte (`<article>`, `<header>`, `<nav>`, `<main>`, `<section>`) — critique pour SEO/GEO/AEO
- Import composants Astro : `@agora/ui-server/src/components/X.astro` (chemin direct, pas via index.ts)
- Icônes : `lucide-static` (SVG strings, zéro JS)
- Headers cache : `Cache-Control: s-maxage=86400, stale-while-revalidate=604800`
- Variables env : préfixe `PUBLIC_` obligatoire côté Astro (sauf `SITE_URL` et `DASHBOARD_URL` serveur-only)
- Scripts inline Astro : JS natif uniquement, jamais de TypeScript (pas de transpilation)
- Tailwind v4 : `@source` obligatoire dans `global.css` pour scanner les packages workspace
- Tokens design dans le bloc `@theme` de `global.css` — jamais de couleur hex hardcodée dans les composants
