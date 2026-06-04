# État de la stack — IBEE vs réalité du repo
*Audit lecture seule, 2026-05-07. Confronte le réel à `.ibee-brain/_BRAIN-DEV.md`.*

> **Constat liminaire** : le repo est, à ce jour, **un monorepo Agora opérationnel**, pas un monorepo IBEE. Le `package.json` racine s'appelle `agora`, tous les packages sont scopés `@agora/*`, le remote GitHub est `Agora_dev.git`. Le dossier `.ibee-brain/` est posé à côté en untracked et ne correspond à aucun code applicatif. Lire ce rapport en gardant cette distinction présente.

---

## 1. Racine et structure

Racine du repo : `C:\Users\KillianLQ\IBEE`.

Top-level présent :

| Élément | État |
|---|---|
| `apps/` | présent → `dashboard/`, `web/` |
| `packages/` | présent → `supabase/`, `ui-react/`, `ui-server/` (pas de `shared/` ni `ui/` unifié) |
| `supabase/` | présent → `config.toml`, `migrations/`, `seeds/`, `.temp/` |
| `.github/` | présent → `pull_request_template.md`, `workflows/ci.yml` |
| `.claude/` | présent (rules + commands) |
| `.ibee-brain/` | présent **untracked** (jamais committé) |
| `package.json` | présent, name = `agora` |
| `pnpm-workspace.yaml` | présent (`apps/*` + `packages/*`) |
| `turbo.json` | présent (4 tasks : build, dev, lint, type-check, test) |
| `tsconfig.base.json` | présent, `strict: true` |
| `.gitignore` | présent (couvre `.env`, `node_modules`, `.turbo`, `.next`, `dist`, `.wrangler`, `.vercel`) |
| `.npmrc` | présent (43 octets) |
| `.gitattributes` | présent |
| `.mcp.json.example` | présent (template) |
| `.mcp.json` | présent localement, ignoré par git |
| `.claudeignore` | présent |
| `knip.json` | présent (config code mort) |
| `pnpm-lock.yaml` | présent (~308 KB) |
| `README.md` racine | **absent** |
| `.env*` racine | **aucun** (conforme : pas de `.env` racine) |

---

## 2. Versions des outils

| Composant | Cible brain | Déclaré / installé | Note |
|---|---|---|---|
| Node | 22+ | `engines: ">=20"` dans `package.json`. Runtime actif `v24.11.1` | ⚠ Le seuil déclaré (≥20) est **inférieur à la cible** (22+). Le runtime local satisfait la cible mais le contrat d'engines ne l'impose pas. CI utilise Node 22 (`.github/workflows/ci.yml:24`). |
| pnpm | non spécifié | `packageManager: "pnpm@10.30.1"` | Conforme à la pratique du brain (pnpm exclusif). |
| Turborepo | non spécifié | `turbo: latest` (devDep racine) | Non pinné. |
| TypeScript | 5.x strict | `^5.8.0` (racine, supabase, ui-react, ui-server, dashboard) | ✓ |
| Astro | 6.x | `^6.1.4` (`apps/web`) | ✓ |
| Next.js | 15.x | `16.2.2` (`apps/dashboard`) | ⚠ **Au-dessus de la cible.** App Router conservé, mais brain à mettre à jour ou app à downgrader selon arbitrage. |
| React | 19 | `19.2.4` (`apps/dashboard`) | ✓ |
| Tailwind | v4 CSS-first | `^4.2.2` (web), `^4` (dashboard, via `@tailwindcss/postcss`) | ✓ Pas de `tailwind.config.*` trouvé. |
| PostgreSQL | 15 | non vérifié (managé par Supabase) | — |
| Better Auth | latest | **absent** | Brain dit "Pas Supabase Auth", mais l'auth en place est Supabase Auth (`@supabase/ssr`). Cf. §9. |
| Stripe Connect | Express | **absent** | Aucune dépendance Stripe. |
| AWS SDK S3 v3 | — | **absent** | Aucun client S3/R2. |

`.nvmrc` : **absent**. La version Node est uniquement déclarée par `engines` et la matrice CI.

---

## 3. Apps et packages

Le brain cible 4 packages : `@ibee/next`, `@ibee/astro`, `@ibee/shared`, `@ibee/ui`. Le repo a **5** packages, tous scopés `@agora/*`.

| Cible brain | Présence repo | Nom réel | Framework | Notes |
|---|---|---|---|---|
| `@ibee/next` (apps/dashboard) | ✓ | `@agora/dashboard` | Next.js 16.2.2, App Router | Structure Next 15+ classique : `src/app/`, `middleware.ts`, `components/`, `hooks/`, `lib/supabase/` |
| `@ibee/astro` (apps/web) | ✓ | `@agora/web` | Astro 6.1.4 SSR, adapter Cloudflare | `src/{layouts,pages,lib,styles}` ; `wrangler.toml` présent |
| `@ibee/shared` (packages/shared) | **absent** | — | — | Pas de package de types partagés. Les types vivent dans `@agora/supabase/src/types.ts` (auto-générés) et dans chaque app. |
| `@ibee/ui` (packages/ui) | ✓ partiellement | split en `@agora/ui-react` + `@agora/ui-server` | React 19 / Astro | Split volontaire par destination de runtime — cf. règle "sans auth → Astro / avec auth → Next" |
| (bonus, hors brain) | ✓ | `@agora/supabase` | client + types + helpers | 14 fichiers dans `src/`, sub-paths exports `./auth/server`, `./auth/browser`, `./auth/middleware` |

Détail des structures :

- **`apps/web` (`@agora/web`)** — `src/layouts/{AppLayout,BaseLayout}.astro`, `src/pages/` (cf. §6), `src/styles/global.css`, `src/lib/supabase/{auth,client}.ts`. Intégrations : `@astrojs/check`, `@astrojs/cloudflare@13.1.8`, `@tailwindcss/vite`, `wrangler`. **Pas de `@astrojs/sitemap`** (sitemap implémenté en custom dans `pages/sitemap.xml.ts`).
- **`apps/dashboard` (`@agora/dashboard`)** — `src/app/{login,account,dashboard}` (App Router), `src/middleware.ts`, `src/components/dashboard/`, `src/hooks/`, `src/lib/supabase/{client,server,middleware}.ts`, `eslint.config.mjs`, `next.config.ts` (avec `transpilePackages: ['@agora/ui-react']`), `postcss.config.mjs`.
- **`packages/supabase` (`@agora/supabase`)** — `src/{client,helpers,follows,publications,notifications,comments,appointments,availability,bookings,clients,cache,types,index}.ts` + `src/auth/{server,browser,middleware,env}.ts` + `src/__tests__/{clients,helpers}.test.ts`. Tests Vitest.
- **`packages/ui-react` (`@agora/ui-react`)** — 10 composants React (cf. §6).
- **`packages/ui-server` (`@agora/ui-server`)** — 19 composants Astro (cf. §6).

---

## 4. Dépendances vs doctrine

### 4.1 Libs **autorisées** par le brain (§10) — état réel

| Lib | Statut brain | Présence repo | Version installée | Note |
|---|---|---|---|---|
| `@supabase/supabase-js` | autorisée | ✓ | `^2.102.1` (dashboard), `^2.49.0` (packages/supabase) | Versions désynchronisées entre dashboard et package partagé. |
| `@supabase/ssr` | autorisée | ✓ | `^0.10.0` (packages/supabase) | — |
| `tailwindcss` v4 | autorisée | ✓ | `^4.2.2` (web), `^4` (dashboard) | — |
| `@tailwindcss/vite` | autorisée | ✓ | `^4.2.2` (web) | — |
| `@fontsource-variable/inter` | autorisée | ✓ partiel | `^5.2.8` (web) | **Absent du dashboard** alors que le `@theme` du dashboard référence `--font-sans: "Inter"`. |
| `lucide-static` | autorisée | ✓ | `^1.7.0` (web) | — |
| `lucide-react` | autorisée | ✓ | `^1.7.0` (dashboard + ui-react) | — |
| `date-fns` | autorisée | ✓ | `^4.1.0` (web, dashboard, ui-react) | — |
| `zod` | autorisée | ✓ partiel | `^4.3.6` (dashboard uniquement) | Présent dans dashboard, absent de web et de packages partagés. Utilisé dans 4 server actions. |
| `sonner` | autorisée | ✓ | `^2.0.7` (dashboard) | — |
| `react-image-crop` | autorisée | ✓ | `^11.0.10` (ui-react) | — |
| `@radix-ui/*` | autorisée (Next only) | ✓ | `@radix-ui/react-slot ^1.0.0` (peerDep ui-react) | Une seule primitive Radix installée. Aucune trace d'import Radix dans `apps/web` (conforme à la règle). |

### 4.2 Libs **interdites** par le brain (§10) — état réel

| Lib | Statut brain | Présence repo |
|---|---|---|
| `axios` | interdite (utiliser `fetch`) | absent ✓ |
| `moment.js` | interdite (utiliser `date-fns`) | absent ✓ |
| `lodash` | interdite | absent ✓ |
| `prisma`, `drizzle`, `kysely` | ORM interdits | absent ✓ |
| `react-query`, `swr`, `tanstack-query` | à discuter | absent ✓ |
| `@radix-ui/*` dans Astro | strictement interdit | absent ✓ (uniquement dans `@agora/ui-react`) |

### 4.3 Libs **non listées** par le brain — zones grises

Présentes dans le repo, ni autorisées ni interdites explicitement :

| Lib | Où | Rôle | Commentaire |
|---|---|---|---|
| `@astrojs/check` | `apps/web` (devDep) | type-check Astro | outillage standard Astro, faible enjeu |
| `wrangler` | `apps/web` (devDep) | CLI Cloudflare | nécessaire pour le déploiement Pages, faible enjeu |
| `@tailwindcss/postcss` | `apps/dashboard` (devDep) | adapter PostCSS Tailwind v4 | nécessaire à Next, faible enjeu |
| `eslint` + `eslint-config-next` | `apps/dashboard` (devDep) | lint | non mentionné par le brain |
| `knip` | racine (devDep) | analyse code mort (`pnpm deadcode`) | outillage qualité |
| `supabase` (CLI) | racine (devDep) | CLI Supabase pour migrations & types | nécessaire au workflow décrit dans `database.md` |
| `vitest` | `packages/supabase` (devDep) | tests unitaires | brain n'évoque pas le framework de tests |
| `@types/node`, `@types/react`, `@types/react-dom` | divers | types | standard |

Aucune lib *présente* ne contredit la liste *interdite*. Les zones grises sont toutes du tooling de support.

### 4.4 Libs **prévues par le brain mais absentes**

Tout le bas de stack au-delà du frontend + Supabase est non provisionné :

- **Better Auth** — absent. L'authentification effective est **Supabase Auth** via `@supabase/ssr` (`packages/supabase/src/auth/{server,browser,middleware}.ts`). C'est un écart explicite avec la doctrine §4 du brain ("Pas Supabase Auth — choix de portabilité").
- **Stripe Connect Express** — absent (aucun `stripe` dans `pnpm-lock.yaml`).
- **AWS SDK S3 v3 / Cloudflare R2** — absent.
- **Mistral API** — absent.
- **Brevo / Mailjet** — absent.
- **Plausible / Sentry** — absent.

---

## 5. Configurations clés

| Élément | Cible brain | État réel |
|---|---|---|
| `tsconfig.base.json` strict | strict global | ✓ `"strict": true` (racine). Hérité par `dashboard`, `supabase`, `ui-react`, `ui-server`. `apps/web` étend `astro/tsconfigs/strict` (équivalent). |
| Tailwind v4 CSS-first | pas de `tailwind.config.*` | ✓ Aucun `tailwind.config.{js,ts,mjs}` trouvé. Tokens dans `@theme` de `apps/web/src/styles/global.css` et `apps/dashboard/src/app/globals.css`. |
| Adapter Cloudflare (`apps/web`) | requis | ✓ `apps/web/astro.config.mjs:9` → `adapter: cloudflare()`. `wrangler.toml` présent (`compatibility_date = "2026-04-16"`, flag `nodejs_compat`). |
| `.env.example` versionné | dans chaque app | ✓ `apps/web/.env.example` (4 vars : `PUBLIC_SUPABASE_URL`, `PUBLIC_SUPABASE_ANON_KEY`, `SITE_URL`, `DASHBOARD_URL`). ✓ `apps/dashboard/.env.example` (5 vars : `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_WEB_URL`, `CLOUDFLARE_ZONE_ID`, `CLOUDFLARE_API_TOKEN`). |
| Aucun `.env` racine | strict | ✓ Aucun `.env*` à la racine. |
| `.gitignore` couvre `.env`, `node_modules`, `.turbo`, `.next`, `dist` | requis | ✓ Tous présents (lignes 2-23). Couvre aussi `.wrangler/`, `.vercel/`, `.mcp.json`, `.agora-brain/`. **Note** : `.ibee-brain/` n'est **pas** dans le `.gitignore` (ligne 78 ignore explicitement `.agora-brain/` mais pas son successeur). C'est pour ça qu'il apparaît untracked. |
| Topologie des secrets (§9 brain) | service_role uniquement dans dashboard | À vérifier — non audité (lecture des `.env.local` hors scope de cet audit). Les `.env.example` ne référencent **aucune** `SERVICE_ROLE_KEY` (cohérent avec la règle). |

---

## 6. Inventaire code existant

Loin d'être à zéro. Le code applicatif Agora est mature.

### Routes Astro (`apps/web/src/pages/`)

- `index.astro` (home)
- `404.astro`
- `explore.astro` (exception JS documentée)
- `notifications.astro`
- `[slug].astro` (profil public)
- `[slug]/news/[publicationSlug].astro`
- `[slug]/services/[serviceSlug].astro`
- `[slug]/services/[serviceSlug]/confirmed.astro`
- `profile-preview/[slug].astro`
- `robots.txt.ts`, `sitemap.xml.ts`, `llms.txt.ts` (générés dynamiquement)
- API routes : `comments.ts`, `follow.ts`, `unfollow.ts`, `search.ts`, `bookings/{available-days,create,slots}.ts`, `notifications/{mark-all-read,mark-read}.ts`

### Routes Next (`apps/dashboard/src/app/`)

- `/` (`page.tsx`)
- `/login` (+ `actions.ts`)
- `/account` (+ `LogoutButton.tsx`)
- `/dashboard`
  - `/dashboard/profile`
  - `/dashboard/publications/new`
  - `/dashboard/site` + `apercu`, `general` (+ `IdentityCard`, `PresentationCard`, `ProfileEditor`, `ProfilePreview`, `actions.ts`)
  - `/dashboard/site/news` + `new` + `[id]/edit`
  - `/dashboard/site/appointments` + `types` (+ `[id]`, `new`) + `availability`
  - `/dashboard/site/clients` + `[id]`

### Composants UI

- `packages/ui-server/src/components/` : 19 composants Astro — `AppointmentBooking`, `AppointmentTypeCard`, `AuthPromptOverlay`, `CommentCard`, `CommentsList`, `GlobalHeader`, `GlobalSidebar`, `MenuTabs`, `ProfileCard`, `ProfileEmptyState`, `ProfileHero`, `ProfilePage`, `PublicationCard`, `PublicationMediaCarousel`, `PublicationTypeSelector`, `PublicationsList`, `RecommendedServices`, `SchemaJsonLd`, `SidebarItem`.
- `packages/ui-react/src/components/` : 10 composants React — `AvatarCropperModal`, `Input`, `ProfileCardReact`, `ProfileHeroReact`, `PublicationActionsMenu`, `PublicationCardPreview`, `PublicationMediaCarousel`, `Textarea`, `UploadAvatar`, `UploadPublicationImages`.
- `apps/dashboard/src/components/dashboard/` : 7 composants locaux — `GlobalHeader`, `MainRail`, `MainRailItem`, `SiteSidebar`, `SiteSidebarGroup`, `SiteSidebarItem`, `UnsavedChangesModal`.

### Server Actions (Next)

5 fichiers `actions.ts` détectés via le directive `'use server'` :
- `apps/dashboard/src/app/login/actions.ts`
- `apps/dashboard/src/app/dashboard/site/general/actions.ts`
- `apps/dashboard/src/app/dashboard/site/clients/actions.ts`
- `apps/dashboard/src/app/dashboard/site/appointments/actions.ts`
- `apps/dashboard/src/app/dashboard/site/news/new/actions.ts`

Les **4 dernières** importent `zod` pour validation.

### Helpers Supabase (`packages/supabase/src/`)

14 fichiers TypeScript : `client.ts`, `helpers.ts`, `follows.ts`, `publications.ts`, `notifications.ts`, `comments.ts`, `appointments.ts`, `availability.ts`, `bookings.ts`, `clients.ts`, `cache.ts`, `types.ts`, `index.ts`, plus le sous-dossier `auth/` (`server.ts`, `browser.ts`, `middleware.ts`, `env.ts`). Exports concrets via barrel `index.ts` : ~40 fonctions typées (entity, follows, publications, notifications, comments, appointments, availability, bookings, clients, cache, auth) + types `Database`, `Client`, `CommentWithAuthor`, `BookingAggregates`, `BookingExtendedStats`, `ServiceContentBlock`. Constante `AGORA_SYSTEM_SLUG = '__agora__'`.

### Schémas Zod

4 fichiers (cf. Server Actions ci-dessus). Aucun schéma Zod dans `apps/web` ni dans les packages partagés.

---

## 7. Supabase

| Élément | État |
|---|---|
| Project ID | **provisionné** : `ztblirxxptdwqobmervk` (documenté en clair dans `.claude/rules/database.md` et `packages/supabase/CLAUDE.md`). Le brain `_BRAIN-DEV.md:185` indique encore `à définir au moment du provisioning` — le brain est en retard sur le réel. |
| Mode CLI | linked remote-only (pas de Docker local) — `supabase/.temp/` présent, `config.toml` présent (~14 KB) |
| Migrations | 17 fichiers dans `supabase/migrations/`, séquentiels du `20260408141149_create_entity_table.sql` au `20260418100000_clients_system.sql` |
| Seeds | `supabase/seeds/update_killian.sql` (seed de dev manuel) |
| Types générés | présent : `packages/supabase/src/types.ts` (~1011 lignes, non vide) |
| Helpers | 14 fichiers dans `packages/supabase/src/` + 4 fichiers `auth/` (cf. §6) |

### Tables Supabase (extraites de `types.ts`)

15 tables :
1. `appointment_types`
2. `availability_exceptions`
3. `availability_schedules`
4. `bookings`
5. `clients`
6. `entity`
7. `entity_faq_items`
8. `entity_global_features`
9. `entity_home_widgets`
10. `entity_menu_sections`
11. `follows`
12. `notifications`
13. `publication_comments`
14. `publication_media`
15. `publications`

Vue : `publication_comments_with_author`.

Fonctions RPC : `check_comment_rate_limit`, `generate_unique_appointment_slug`, `generate_unique_publication_slug`, `generate_unique_slug_from_email`, `get_user_entity_ids`, `insert_slug_history`, `refresh_client_counters`, `slugify`, `unaccent`.

> Le brain `_BRAIN-DEV.md:89` parle d'un modèle **`entities` unique avec colonne `type`** pour fusionner perso/business/futurs personas. Le schéma réel a une table `entity` (singulier) sans le pattern décrit dans le brain. Cohérence à arbitrer.

> `packages/supabase/CLAUDE.md` annonce 14 tables ; le `types.ts` en expose 15. La table additionnelle non listée dans ce CLAUDE.md est `clients` (ajoutée par migration `20260418100000_clients_system.sql`).

---

## 8. Git et CI

| Élément | État |
|---|---|
| Branche par défaut | `main` |
| Branche active | `chore/fix-github-commit-auto-branch` (1 commit ahead, 2 behind `origin/main`) |
| Working tree | non-clean : 4 fichiers modifiés (`.claude/commands/research/web.md`, `.claude/rules/brain.md`, `.claude/rules/collaboration.md`, `CLAUDE.md`) + 3 untracked (`.claude/commands/research/synthesis.md`, `.claude/rules/observations.md`, `.ibee-brain/`) |
| Remote | `origin = https://github.com/EgdeLownK/Agora_dev.git` |
| Branches distantes | `main`, `chore/fix-github-commit-auto-branch`, `feat/git-commands-and-rules-cleanup`, `feat/research-web-command`, `feat/sync-command-and-push-fix` |
| Workflow CI | `.github/workflows/ci.yml` — sur `pull_request` vers `main` : `setup-node@v4` (Node 22) + `pnpm/action-setup@v4` + `pnpm install --frozen-lockfile` → `pnpm type-check` → `pnpm build` (avec env Supabase placeholder) → `pnpm run -r --if-present test`. Concurrency group activé. |
| Hooks pre-commit | **aucun** (pas de `.husky/`, pas de `lefthook.yml`, `.git/hooks/` ne contient que les `.sample`) |
| `pull_request_template.md` | présent dans `.github/` |

---

## 9. Synthèse — écart au brain

### Conforme au brain

- Monorepo Turborepo + pnpm workspaces opérationnel (4 tasks Turbo, lockfile v10.30.1).
- TypeScript strict global (`tsconfig.base.json`) hérité partout.
- Apps Astro 6 + Next ≥15 + React 19 — ratio public/privé respecté (Astro pour `apps/web`, Next pour `apps/dashboard`).
- Adapter Cloudflare configuré sur `apps/web` (`@astrojs/cloudflare@13.1.8` + `wrangler.toml`).
- Tailwind v4 CSS-first sans `tailwind.config.*` ; tokens dans `@theme`.
- Topologie `.env` conforme : aucun `.env` racine, `.env.example` versionnés dans chaque app, aucune `SERVICE_ROLE_KEY` dans les `.env.example`.
- Toutes les libs *autorisées* par le brain sont présentes (sauf `@fontsource-variable/inter` côté dashboard), aucune lib *interdite* installée.
- Supabase provisionné (project `ztblirxxptdwqobmervk`), 17 migrations, 15 tables, types générés, ~40 helpers exportés.
- CI GitHub Actions (Node 22, type-check + build + test) sur PR vers `main`.

### Absent et à provisionner si on suit le brain à la lettre

- **Better Auth** — l'auth en place est Supabase Auth, en contradiction avec §4 du brain. Soit Better Auth est installé, soit le brain est mis à jour pour acter Supabase Auth.
- **Stripe Connect Express** + webhook signé HMAC.
- **Cloudflare R2** + `@aws-sdk/client-s3` + Cloudflare Image Resizing.
- **Mistral API** (clé + client).
- **Brevo OU Mailjet** (clé + client) — choix à trancher.
- **Plausible** (analytics) + **Sentry** (monitoring) — pas configurés.
- **Package `@ibee/shared`** (types TS partagés) — actuellement les types sont logés dans `@agora/supabase`.
- **`@astrojs/sitemap`** — le brain dit "sitemap auto-généré par Astro", le repo a un sitemap custom (`pages/sitemap.xml.ts`). Cohérent fonctionnellement, mais dépend de l'arbitrage : on garde le custom ou on bascule sur le plugin officiel ?
- **`.nvmrc`** absent (la version Node est uniquement déclarée par `engines: ">=20"` qui ne suffit pas pour atteindre la cible 22+).
- **Hooks pre-commit** — aucun. Pas obligatoire selon le brain, mais à noter.

### Présent mais en écart avec le brain

- **Naming `@agora/*` partout** vs cible brain `@ibee/*`. Le `package.json` racine s'appelle `agora`. C'est l'écart structurel principal — IBEE n'existe que dans le brain.
- **Next.js 16.2.2** vs cible 15.x. Au-dessus de la cible, fonctionnellement compatible (App Router conservé).
- **`engines.node = ">=20"`** vs cible "Node 22+".
- **Next.js majeure** sans branche/PR de migration tracée dans le brain — à évaluer.
- **Modèle de données `entity` (singulier)** vs cible brain "`entities` unique avec colonne `type`". Le pattern de fusion perso/business/futurs personas par type n'est pas en place tel que décrit.
- **Décompte des tables** : `packages/supabase/CLAUDE.md` annonce 14 tables, le `types.ts` en expose **15** (table `clients` ajoutée le 2026-04-18 et non répercutée dans ce CLAUDE.md).
- **`@supabase/supabase-js`** : version désynchronisée entre `apps/dashboard` (`^2.102.1`) et `packages/supabase` (`^2.49.0`).
- **`@fontsource-variable/inter`** : présent côté `apps/web`, absent du `apps/dashboard` alors que le `@theme` du dashboard référence `--font-sans: "Inter"`.
- **`turbo: latest`** non pinné.
- **Brain `_BRAIN-DEV.md:62` colonne *Actuel* vide** : la doctrine demande à Claude Code de remplir les versions installées au démarrage du dev, ce n'est pas fait.

### Zones grises — arbitrage Killian

1. **Pivot Agora → IBEE.** Question fondamentale et préalable à tout : est-ce qu'IBEE = Agora rebrandé (alors le rapport ci-dessus suffit, il faut un plan de rename + de complétion des briques manquantes) ou IBEE = nouveau monorepo from scratch (alors `apps/`, `packages/`, `supabase/` actuels sont du legacy et le travail commence ailleurs) ? Le brain ne tranche pas explicitement.
2. **Auth : Supabase Auth (en place) vs Better Auth (cible brain).** Migration coûteuse, à motiver explicitement.
3. **Sitemap : custom (en place) vs `@astrojs/sitemap` (cible brain).**
4. **Modèle `entity` (singulier, en place) vs `entities` polymorphe par type (cible brain).** Refactor schéma + RLS lourd.
5. **`Next 16` (en place) vs `Next 15` (cible brain).** Mise à jour du brain ou downgrade ?
6. **Outils non listés par le brain** : `knip`, `vitest`, `eslint-config-next`, `wrangler`, `@astrojs/check`. Ratifier explicitement la liste.
7. **Decision-log** : aucun `_decision-log-code.md` ni `_decision-log-projet.md` détecté dans `.ibee-brain/`. Les choix techniques actuels ne sont pas tracés dans le brain IBEE.

---

## Réponses aux questions de vérification

- **Le monorepo est-il initialisé ? Quels packages sont déjà créés ?**
  Oui, monorepo **Agora** opérationnel (Turborepo + pnpm). 5 packages : `@agora/dashboard`, `@agora/web`, `@agora/supabase`, `@agora/ui-react`, `@agora/ui-server`. Aucun `@ibee/*` n'existe.

- **Quelles libs sont déjà installées ? Lesquelles manquent ?**
  *Installées* : Astro 6, Next 16, React 19, TS 5.8, Tailwind v4, Supabase JS + SSR, lucide (static + react), date-fns, zod, sonner, react-image-crop, @radix-ui/react-slot, @astrojs/cloudflare, wrangler, vitest, knip, supabase CLI. *Manquantes (vs brain)* : Better Auth, Stripe, AWS SDK S3 / Cloudflare R2, Mistral, Brevo/Mailjet, Plausible, Sentry, `@astrojs/sitemap`, `@fontsource-variable/inter` côté dashboard.

- **Le projet Supabase est-il provisionné ?**
  Oui. Project ID `ztblirxxptdwqobmervk`, 17 migrations appliquées, 15 tables, 9 fonctions RPC, types générés (~1011 lignes).

- **Y a-t-il déjà du code applicatif ou est-on à zéro ?**
  Loin de zéro. ~17 routes Astro publiques + ~17 routes Next dashboard, ~36 composants UI (19 Astro + 10 React + 7 dashboard locaux), 5 server actions (4 avec validation Zod), ~40 helpers Supabase typés exportés via barrel.

- **Quelle est la première brique manquante pour démarrer le dev ?**
  La question préalable n'est pas une brique technique mais une **décision Killian** : on continue Agora (renommage progressif vers IBEE + complétion des briques manquantes : Better Auth, Stripe, R2, Mistral, emails, monitoring) ou on démarre un nouveau monorepo IBEE et on fige le repo actuel comme legacy. Tant que cette décision n'est pas prise, le brain `_BRAIN-DEV.md` et le code sont dans deux mondes différents. Si on continue Agora, la **brique manquante n°1** est l'arbitrage Better Auth vs Supabase Auth — toutes les autres briques (Stripe, R2, etc.) peuvent s'ajouter par-dessus l'auth en place sans dette nouvelle.
