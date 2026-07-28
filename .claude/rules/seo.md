---
paths:
  - "apps/platform/src/app/robots.ts"
  - "apps/platform/src/app/sitemap.ts"
  - "apps/platform/src/components/public/**/*JsonLd*.tsx"
  - "apps/platform/src/app/(public)/**"
  - "apps/platform/src/components/public/**"
---
# SEO/GEO/AEO

Déclinaison technique du principe de visibilité native (voir
`.claude/rules/produit.md`), implémentée côté Next.js (routes `(public)/*`,
SSR/ISR).

- **robots.txt** (`apps/platform/src/app/robots.ts`) : allow explicite pour
  `Googlebot`, `Bingbot`, `GPTBot`, `ChatGPT-User`, `ClaudeBot`,
  `PerplexityBot`, `OAI-SearchBot`, `Google-Extended`, `Amazonbot` ; disallow
  `/dashboard`, `/login`. **Relire ce fichier avant de recopier la liste
  ailleurs** — elle a déjà dérivé une fois entre la doctrine et le code.
- **Sitemap** (`apps/platform/src/app/sitemap.ts`) : liste toutes les
  entités (hors slugs préfixés `__`, réservés) + publications `status =
  'published'` + services `is_active = true` + produits/événements
  équivalents. Pas de colonne `is_public` — ne pas la chercher, elle
  n'existe pas sur `entity`.
- **Sémantique HTML stricte** sur toute page/composant public : `<article>`,
  `<header>`, `<nav>`, `<main>`, `<section>` plutôt que des `<div>` génériques
  — critique pour le parsing SEO/GEO/AEO (moteurs classiques et LLM).
- **JSON-LD** : un composant dédié par type de contenu —
  `ProfileJsonLd`, `ProductSchemaJsonLd`, `ServiceSchemaJsonLd`,
  `EventSchemaJsonLd`, `PublicationArticleJsonLd`.
- **OG Image** : générée côté serveur via `@vercel/og`.
- **Meta title** : format vérifié `${titre} — IBEE` (ex. profil, produit) —
  pas de suffixe `| IBEE` séparé.
- **URL canonique + redirect** : confirmé implémenté pour les produits
  (`permanentRedirect` + table `product_slug_history`, voir
  `apps/platform/src/app/(public)/[slug]/shop/[productSlug]/page.tsx`). Une
  règle métier précise du type "max 2 URLs par compte, libération auto à 6
  mois" n'a pas été retrouvée dans le code lu — ne pas l'affirmer comme
  active sans vérification supplémentaire.
