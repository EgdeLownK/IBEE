---
paths:
  - "apps/platform/**"
  - "packages/**"
---
# Architecture IBEE

Monorepo Turborepo + pnpm workspaces. Une seule app déployée (`@ibee/platform`,
Next.js App Router, Vercel) qui sert le SEO/GEO/AEO public, le studio owner et
les APIs — plus de split par framework. Stack de données : Supabase
(PostgreSQL + Storage + Realtime + RLS) → Supabase Auth → Stripe Checkout /
Resend pour les emails transactionnels.

Numéros de version : ne pas les recopier ici, ils dérivent à chaque bump de
dépendance — vérifier dans le `package.json` du package concerné.

## Principes non-négociables

- **TypeScript strict partout** (`tsconfig.base.json`, `strict: true`).
- **Codebase unique, jamais de fork.** Un persona ou un type de profil se
  paramètre (flags, données), ne se duplique jamais en variante "Pro"/"Free"
  ou en branche séparée.
- **Modularité par blocs indépendants.** Chaque bloc fonctionnel publié sur
  une page (produits, services, événements, publications, historique…) a sa
  propre table et sa propre logique. Ajouter un type de bloc n'impacte pas
  les blocs existants.
- **Table `entity` (singulier)** unique, partagée par tous les types de
  profil, distinguée par un champ `type` — jamais une table par persona.

## Décisions actées (avec justification)

- **Auth : Supabase Auth**, pas Better Auth — choix de rapidité (déjà
  intégré à `auth.uid()`/RLS). Aucune dépendance Better Auth dans le repo à
  ce jour : si une migration démarre, ce paragraphe devient faux et doit
  être corrigé au moment où le code change, pas avant.
- **Stockage fichiers : Supabase Storage**, pas Cloudflare R2 (aucun client
  S3/R2 dans la codebase).
- **Paiement : Stripe Checkout** implémenté. Stripe Connect (fee acheteur,
  multi-vendeur) non implémenté — à construire seulement quand le besoin
  marketplace se confirme, ne pas anticiper.
