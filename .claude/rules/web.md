---
paths:
  - "apps/web/**"
  - "packages/ui-server/**"
---
# Règles apps/web + ui-server

- Astro 6 SSR, adapter Cloudflare, **zéro JS client** sur les pages profil
- Aucun import depuis `@ibee/ui-react` — uniquement `@ibee/ui-server`
- Exception JS documentée : `/explore` (recherche live, vanilla JS inline, noindex)
- Toute nouvelle exception JS doit être justifiée en commentaire au-dessus de l'import
- Sémantique HTML stricte (`<article>`, `<header>`, `<nav>`, `<main>`, `<section>`) — critique pour SEO/GEO/AEO
- Import composants Astro : `@ibee/ui-server/src/components/X.astro` (chemin direct, pas via index.ts)
- Icônes : `lucide-static` (SVG strings, zéro JS)
- Headers cache : `Cache-Control: s-maxage=86400, stale-while-revalidate=604800`
- Variables env : préfixe `PUBLIC_` obligatoire côté Astro (sauf `SITE_URL` et `DASHBOARD_URL` serveur-only)
- Scripts inline Astro : JS natif uniquement, jamais de TypeScript (pas de transpilation)
- Tailwind v4 : `@source` obligatoire dans `global.css` pour scanner les packages workspace
- Tokens design dans le bloc `@theme` de `global.css` — jamais de couleur hex hardcodée dans les composants

## Debug CSS — chercher la cause, pas empiler les patchs

- Un style qui « ne s'applique pas » malgré `!important` + style inline = signal que la cause est **ailleurs** (parent, cascade, layout). Ne JAMAIS empiler les `!important` : retirer le hack, trouver la racine.
- **Coin/bord rogné ou tronqué** → vérifier `overflow: hidden` + `border-radius` sur un **conteneur parent** : un enfant pleine largeur dont un bord touche le bord du parent voit ses coins clippés par le radius du parent. (Cas vécu : bouton « Modifier » dont les coins bas étaient rognés par `.product-detail__buybox`.)
- Avant de styler un élément, lire le CSS de **son conteneur** : reliquats (`overflow`, `border-radius`, `::before`, `z-index`) d'un ancien design transparent/sans fond cassent souvent l'affichage.
- Nettoyer derrière soi : supprimer les `!important`, styles inline et propriétés mortes une fois la vraie cause corrigée.

## Cache HMR — CSS scopé d'un composant du package qui « ne s'applique pas »

- Symptôme : après avoir **réécrit / ajouté de nouvelles classes** dans un composant `@ibee/ui-server` (`.astro`), le HTML neuf s'affiche mais les **nouvelles classes n'ont aucun style** (les anciennes oui). Ce n'est PAS un bug de code : Vite sert l'ancienne feuille de style scopée mise en cache.
- Cause : le CSS scopé des `.astro` d'un package workspace n'est pas toujours réinvalidé côté app consommatrice lors d'un HMR.
- Fix : redémarrer le serveur de dev en vidant le cache.
  - PowerShell : `Remove-Item -Recurse -Force apps/web/node_modules/.vite, apps/web/.astro -ErrorAction SilentlyContinue` puis `pnpm dev`.
- Réflexe : **après toute réécriture de composant `ui-server`**, prévenir l'utilisateur que si une nouvelle classe paraît « sans CSS », c'est ce cache → hard refresh + restart, pas une correction de code à empiler.
