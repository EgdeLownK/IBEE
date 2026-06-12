# Migration IBEE — Astro → Next.js unifié

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Date :** 2026-06-12  
**Statut :** Plan de référence — à exécuter phase par phase  
**Auteur :** Killian LQ (consolidé depuis analyse projet + revue technique)

**Goal :** Supprimer `apps/web` (Astro) et unifier toute l’expérience IBEE dans **une seule app Next.js** (`apps/dashboard`, renommée `apps/platform` uniquement au cutover final), avec parité visuelle et SEO identiques, hébergement **Vercel**.

**Principe directeur :** on ne réécrit pas, on **porte** 1-1. Même markup, mêmes props, même CSS. Toute divergence visuelle est un bug.

---

## Contexte — où on en est

### Phase 9 (studio owner) — largement terminée ✅

| Élément | État |
|---------|------|
| Studio `/dashboard/site` | Hero éditable, onglets, widgets, news, FAQ, histoire |
| Wizards produit / service / event | Création OK ; édition via routes `/products/:id` à venir |
| Page `/dashboard/site/general` | Remplace `informations.astro` |
| Cutover owner | `[slug].astro` redirect owner → dashboard (sauf `?preview=1`) |
| Shell global React | `GlobalHeader`, `GlobalSidebar`, `FloatingNavPill`, `AppShell` |
| Server Actions studio | `*-actions.ts` dans `dashboard/site/` |
| APIs web owner | Marquées `@deprecated` — à supprimer en phase 15 |

### Ce qui reste sur Astro ❌

| Surface | Détail |
|---------|--------|
| **Pages publiques** | 14 routes `.astro` (voir inventaire) |
| **APIs publiques** | ~15 Route Handlers à porter |
| **`packages/ui-server`** | 62 composants `.astro` + 11 modules `.ts` |
| **Infra** | Cloudflare Pages, `@astrojs/cloudflare`, `purgeEntityCache` CF |

### Packages actuels

```
apps/dashboard/     Next.js 16 — studio owner (+ futur public)
apps/web/           Astro 6   — À SUPPRIMER
packages/ui-react/  Composants React studio + app-shell.css
packages/ui-server/ Composants Astro + logique TS — À DÉCOMPOSER
packages/supabase/  Inchangé — source de vérité data
```

---

## Décisions verrouillées

| Sujet | Décision | Raison |
|-------|----------|--------|
| Hébergement | **Vercel** | Studio déjà dessus ; un seul déploiement |
| Stratégie composants | **Portage 1-1** Astro → React | Fidélité, pas de réécriture créative |
| Priorité | **SEO d’abord** | `/{slug}` puis pages détail |
| App unique | **Étendre `apps/dashboard`** | Pas de 3ᵉ app ; rename `platform` en phase 15 seulement |
| `packages/ui` fusion | **Progressive** | `ui-react` + dossier `server/` ; `ui-server` en parallèle jusqu’à la fin |
| `packages/shared` | **Extraction immédiate** (phase 10) | TS pur, zéro risque, débloque tout |
| Overlays owner Astro | **Ne pas porter** | Déjà remplacés par le studio React |
| `informations.astro` | **Redirect only** | Déjà → `/dashboard/site/general` |
| URLs publiques | **Identiques** | Aucun 301 sauf exception documentée |
| Cache prod | **`revalidate` + `revalidatePath`** | Remplace `purgeEntityCache` Cloudflare |

---

## Architecture cible

```
apps/
  dashboard/                    ← renommé apps/platform en phase 15 uniquement
    src/
      app/
        (public)/               ← visiteur SEO / ISR
          layout.tsx            ← AppShell (header + sidebar + navpill)
          page.tsx              ← /
          explore/page.tsx
          notifications/page.tsx
          profile-preview/[slug]/page.tsx   ← panneau Explore (embed)
          [slug]/
            page.tsx            ← profil public
            shop/[productSlug]/page.tsx
            news/[publicationSlug]/page.tsx
            services/[serviceSlug]/
              page.tsx
              booking/page.tsx
              confirmed/page.tsx
            events/[eventSlug]/page.tsx
            message/page.tsx
          not-found.tsx
        (studio)/               ← inchangé
          dashboard/
            site/               ← studio owner
            site/general/
            ...
        api/                    ← Route Handlers (ex apps/web/src/pages/api)
          search/route.ts
          follow/route.ts
          unfollow/route.ts
          comments/route.ts
          bookings/...
          notifications/...
          events/register/route.ts
          product-reviews/route.ts
          product-questions/route.ts
          wishlist/route.ts
        sitemap.ts                ← MetadataRoute.Sitemap Next.js
        robots.ts
        llms.txt/route.ts
      components/
        dashboard/              ← AppShell, GlobalHeader, GlobalSidebar, FloatingNavPill
        profile/                ← studio (existant)
        public/                 ← wrappers pages publiques si besoin

packages/
  shared/                       ← NOUVEAU — logique TS pure (ex ui-server/src/*.ts)
  ui-react/                     ← existant + src/server/ pour composants portés
    src/
      components/               ← inchangé
      profile/                  ← studio CSS + primitives
      server/                   ← NOUVEAU — composants portés depuis ui-server
      app-shell.css
      tokens.css                ← fusion CSS globaux (phase 10)
  supabase/                     ← inchangé ; adapter cache.ts phase 10

SUPPRIMÉ en phase 15 :
  apps/web/
  packages/ui-server/
```

### Doctrine des surfaces (post-migration)

| Surface | URL | Rôle |
|---------|-----|------|
| Public | `/{slug}`, pages détail, explore… | SSR/ISR SEO, interactions visiteur |
| Studio | `/dashboard/site` | Édition owner — Server Actions |
| Preview owner | `/{slug}?preview=1` | Aperçu public sans redirect studio |

---

## Règles de portage Astro → React

### Server vs Client Component

| Devient `'use client'` si… | Sinon Server Component |
|---------------------------|----------------------|
| `<script>` avec DOM / fetch client | Fetch Supabase en RSC |
| `useState`, effets navigateur | Markup statique |
| Accordéons, formulaires, carrousels interactifs | JSON-LD, metadata |

### Mapping syntaxe

| Astro | Next.js |
|-------|---------|
| Frontmatter `---` (fetch) | Corps `async` du Server Component |
| `Astro.params` | `params` (Promise en Next 15+) |
| `Astro.url.searchParams` | `searchParams` |
| `Astro.redirect()` | `redirect()` from `next/navigation` |
| `return new Response(404)` | `notFound()` |
| `Cache-Control: s-maxage=N` | `export const revalidate = N` |
| Pages auth / preview owner | `export const dynamic = 'force-dynamic'` |
| `<slot name="head">` | `generateMetadata()` + `JsonLd` component |
| `set:html={svg}` (lucide-static) | `<Icon />` from `lucide-react` |
| `class:list={[...]}` | `cn(...)` (clsx) |
| `import.meta.env.SITE_URL` | `process.env.NEXT_PUBLIC_WEB_URL` |
| CSS `<style>` scoped | CSS Module `.module.css` ou classes globales `packages/ui-react` |

### Règle CSS

1. Lire le `<style>` scoped du `.astro` source.
2. Porter en CSS Module ou réutiliser classes existantes (`profile-styles.css`, `app-shell.css`).
3. Valider 3 breakpoints : **390px, 800px, 1200px**.

---

## Inventaire complet à migrer

### Pages Astro → `(public)/`

| Route Astro | Route Next | revalidate | Notes |
|-------------|------------|------------|-------|
| `index.astro` | `/` | 300 | Home |
| `explore.astro` | `/explore` | 300 | Client : search + preview |
| `notifications.astro` | `/notifications` | dynamic | Auth requise |
| `404.astro` | `not-found.tsx` | — | |
| `[slug].astro` | `/[slug]` | 86400 | **Priorité SEO #1** ; preview → dynamic |
| `profile-preview/[slug].astro` | `/profile-preview/[slug]` | 60 | Embed Explore ; layout minimal |
| `[slug]/news/[publicationSlug].astro` | `/[slug]/news/[publicationSlug]` | 86400 | |
| `[slug]/services/[serviceSlug].astro` | `/[slug]/services/[serviceSlug]` | 86400 | |
| `[slug]/services/.../booking.astro` | `.../booking` | dynamic | Client lourd |
| `[slug]/services/.../confirmed.astro` | `.../confirmed` | dynamic | |
| `[slug]/events/[eventSlug].astro` | `/[slug]/events/[eventSlug]` | 86400 | |
| `[slug]/shop/[productSlug].astro` | `/[slug]/shop/[productSlug]` | 86400 | Le plus lourd |
| `[slug]/message.astro` | `/[slug]/message` | dynamic | Auth |
| `[slug]/informations.astro` | — | — | **Redirect** → `/dashboard/site/general` |

### APIs Astro → `app/api/`

**À porter (publiques) :**

| Astro | Next | Méthode |
|-------|------|---------|
| `api/search.ts` | `api/search/route.ts` | GET |
| `api/follow.ts` | `api/follow/route.ts` | POST |
| `api/unfollow.ts` | `api/unfollow/route.ts` | POST |
| `api/comments.ts` | `api/comments/route.ts` | POST, DELETE |
| `api/bookings/available-days.ts` | `api/bookings/available-days/route.ts` | GET |
| `api/bookings/slots.ts` | `api/bookings/slots/route.ts` | GET |
| `api/bookings/create.ts` | `api/bookings/create/route.ts` | POST |
| `api/notifications/mark-read.ts` | `api/notifications/mark-read/route.ts` | POST |
| `api/notifications/mark-all-read.ts` | `api/notifications/mark-all-read/route.ts` | POST |
| `api/events/register.ts` | `api/events/register/route.ts` | POST |
| `api/product-reviews.ts` | `api/product-reviews/route.ts` | GET, POST |
| `api/product-questions.ts` | `api/product-questions/route.ts` | GET, POST |
| `api/wishlist.ts` | `api/wishlist/route.ts` | GET, POST, DELETE |
| `api/auth/logout.ts` | `api/auth/logout/route.ts` | POST |

**À supprimer (owner — déjà dans dashboard) :**

`api/products.ts`, `api/services.ts`, `api/events.ts`, `api/publications.ts`, `api/home-widgets.ts`, `api/menu-sections.ts`, `api/entity-faq.ts`, `api/entity-history.ts`, `api/entity-contact-info.ts`, `api/entity-files.ts`, `api/product-upload.ts`

### Composants ui-server — portage vs suppression

#### ❌ Ne pas porter (overlays owner — morts après phase 9)

`ProductCreateOverlay`, `ServiceCreateOverlay`, `EventCreateOverlay`, `AddContentOverlay`, `FaqEditOverlay`, `HistoryEditOverlay`, `HomeWidgetConfigOverlay`, `PublicationTypeSelector` (si studio only)

#### ✅ Porter vers `packages/ui-react/src/server/`

**Profil public (phase 12) :**

| Astro | React | Client ? |
|-------|-------|----------|
| `ProfilePage.astro` | `ProfilePage.tsx` | Non (orchestrateur) |
| `ProfileHero.astro` | `ProfileHero.tsx` | Partiel (follow/share) |
| `ProfileCard.astro` | `ProfileCard.tsx` | Non |
| `MenuTabs.astro` | `MenuTabs.tsx` | **Oui** (tabs hash) |
| `ProfileStories.astro` | `ProfileStories.tsx` | Non |
| `HomeWidgetsSection.astro` | `HomeWidgetsSection.tsx` | Non |
| `HomeWidgetRenderer.astro` | `HomeWidgetRenderer.tsx` | Partiel |
| `PublicationsList.astro` | `PublicationsList.tsx` | Partiel (card click) |
| `PublicationCard.astro` | `PublicationCard.tsx` | **Oui** |
| `ShopPlaylist.astro` | `ShopPlaylist.tsx` | **Oui** (search) |
| `ServicePlaylist.astro` | `ServicePlaylist.tsx` | Non |
| `EventPlaylist.astro` | `EventPlaylist.tsx` | Non |
| `*Widget.astro` (6) | `*Widget.tsx` | Non |
| `SchemaJsonLd.astro` | `JsonLd.tsx` + metadata | Non |

**Pages détail (phase 13) :**

| Astro | React | Client ? |
|-------|-------|----------|
| `DetailTopBar.astro` | `DetailTopBar.tsx` | Non |
| `DetailEntityStrip.astro` | `DetailEntityStrip.tsx` | Non |
| `EntityDetailBody.astro` | `EntityDetailBody.tsx` | Partiel (galerie) |
| `EntityMoreDetails.astro` | `EntityMoreDetails.tsx` | **Oui** |
| `ProductDetail.astro` | `ProductDetail.tsx` | **Oui** |
| `ProductFaq.astro` | `ProductFaq.tsx` | **Oui** |
| `ProductReviewsList.astro` | `ProductReviewsList.tsx` | **Oui** |
| `PublicationDetail*.astro` | `PublicationDetail*.tsx` | Partiel |
| `CommentsList.astro` | `CommentsList.tsx` | **Oui** |
| `CommentCard.astro` | `CommentCard.tsx` | Non |
| `RelatedContent.astro` | `RelatedContent.tsx` | Non |
| `AppointmentBooking.astro` | `BookingWidget.tsx` | **Oui** |
| `AuthPromptOverlay.astro` | `AuthPromptOverlay.tsx` | **Oui** |
| `PublicationMediaCarousel.astro` | Réutiliser `@ibee/ui-react` existant | Partiel |

**Shell — déjà en React ✅**

`GlobalHeader`, `GlobalSidebar`, `FloatingNavPill` → `apps/dashboard/src/components/dashboard/`

---

## Phase 10 — Fondations (1 semaine)

**Objectif :** monorepo prêt, studio intact, cache Vercel, scaffold public vide.

### 10.1 — Créer `packages/shared`

- [ ] **10.1.1** Créer `packages/shared/package.json` (`@ibee/shared`)
- [ ] **10.1.2** Copier depuis `packages/ui-server/src/` :
  - `entity-profile.ts`, `faq-items.ts`, `history-blocks.ts`
  - `home-widget-config.ts`, `widget-display-content.ts`, `widget-empty-content.ts`
  - `presentation-fields.ts`, `product-create.ts`, `service-create.ts`, `event-create.ts`
  - `lib/banner-image-crop.ts`
- [ ] **10.1.3** `packages/ui-server/src/index.ts` réexporte `@ibee/shared` (compat temporaire)
- [ ] **10.1.4** Mettre à jour imports dashboard vers `@ibee/shared` progressivement
- [ ] **10.1.5** `pnpm type-check` + `pnpm build` verts

### 10.2 — Adapter le cache pour Vercel

- [ ] **10.2.1** Étendre `packages/supabase/src/cache.ts` :
  - Si `VERCEL` ou pas de `CLOUDFLARE_*` → no-op côté CF
  - Exposer `getRevalidatePaths(slug, …)` pour usage dans Server Actions
- [ ] **10.2.2** Dans chaque `*-actions.ts` studio : appeler `revalidatePath('/[slug]')` + tags si besoin
- [ ] **10.2.3** Documenter dans `.env.example` : retirer vars Cloudflare à terme

### 10.3 — Scaffold route group `(public)`

- [ ] **10.3.1** Créer `apps/dashboard/src/app/(public)/layout.tsx` — réutilise `AppShell`
- [ ] **10.3.2** Créer `(public)/page.tsx` — placeholder « IBEE — Home »
- [ ] **10.3.3** Créer `(public)/not-found.tsx`
- [ ] **10.3.4** Déplacer `(studio)/dashboard/...` via route group si nécessaire (URLs inchangées)
- [ ] **10.3.5** Redirect `informations` dans `next.config.ts` :
  ```ts
  { source: '/:slug/informations', destination: '/dashboard/site/general', permanent: true }
  ```

### 10.4 — Unifier tokens CSS

- [ ] **10.4.1** Créer `packages/ui-react/src/tokens.css` — fusion :
  - `apps/web/src/styles/global.css` (@theme + utilitaires profil)
  - `app-shell.css`, `profile-styles.css` (sans doublons)
- [ ] **10.4.2** Importer dans `apps/dashboard/src/app/globals.css`
- [ ] **10.4.3** `--shadow-nav` et variables manquantes alignées

### 10.5 — CI / Turbo

- [ ] **10.5.1** Vérifier GitHub Actions : build `apps/dashboard` uniquement pour le public (Astro encore en parallèle jusqu’à phase 15)
- [ ] **10.5.2** `pnpm dev` : dashboard sert `/` + `/dashboard/site`

**Livrable phase 10 :** build vert, studio sans régression, `/` rendu par Next, `packages/shared` créé, `revalidatePath` branché.

---

## Phase 11 — Shell public + Home + Explore + Notifications (1 semaine)

- [ ] **11.1** `(public)/layout.tsx` — parité `AppLayout.astro` :
  - Auth : `createAuthClient`, entity, notifications, unread count
  - `showSidebar={true}`, `pb-[100px]` pour navpill
  - Branche `?embed=true` (réécriture liens — port script Astro)
- [ ] **11.2** `(public)/page.tsx` — port `index.astro`, `revalidate = 300`
- [ ] **11.3** `(public)/explore/page.tsx` + `ExploreClient.tsx` (search, preview fetch)
- [ ] **11.4** `(public)/profile-preview/[slug]/page.tsx` — layout embed minimal
- [ ] **11.5** `api/search/route.ts` — **avant** explore si pas encore fait
- [ ] **11.6** `(public)/notifications/page.tsx` + `NotificationsClient.tsx`, `dynamic = 'force-dynamic'`
- [ ] **11.7** Tests manuels : shell identique dashboard, navpill liens web OK

**Livrable phase 11 :** `/`, `/explore`, `/notifications`, `/profile-preview/[slug]` fonctionnels.

---

## Phase 12 — Profil public `/{slug}` (1–2 semaines) — PRIORITÉ SEO

- [ ] **12.1** `(public)/[slug]/page.tsx` — port intégral `[slug].astro` :
  - `generateMetadata()` + `JsonLd`
  - `revalidate = 86400` ; `?preview=1` → `dynamic = 'force-dynamic'`
  - Redirect owner → `/dashboard/site`
  - Même `Promise.all` fetch (publicOnly)
- [ ] **12.2** Porter composants `packages/ui-react/src/server/profile/` :
  - `ProfilePage`, `ProfileHero`, `MenuTabs`, `HomeWidgetsSection`, `HomeWidgetRenderer`
  - Playlists : `ShopPlaylist`, `ServicePlaylist`, `EventPlaylist`, `PublicationsList`
  - Widgets : Bio, FAQ, History, News, Shop, Service, Event, BannerWelcome
- [ ] **12.3** `MenuTabs.tsx` — Client : navigation hash `#shop`, `#news`, etc.
- [ ] **12.4** `ProfileHero.tsx` — Client : follow/unfollow, share (après APIs phase 14 ou inline)
- [ ] **12.5** Checklist parité visuelle vs Astro `:4321/{slug}` (390 / 800 / 1200)
- [ ] **12.6** Lighthouse ≥ 90, Rich Results Test JSON-LD

**Livrable phase 12 :** profil public SEO-ready sur Vercel preview.

---

## Phase 13 — Pages détail (2–3 semaines)

Ordre : **news → service → APIs booking → booking UI → event → shop**.

### 13.1 — News (2 jours)

- [ ] **13.1.1** `(public)/[slug]/news/[publicationSlug]/page.tsx`
- [ ] **13.1.2** Composants : `DetailTopBar`, `PublicationDetailHeader`, `PublicationDetail`, `CommentsList`
- [ ] **13.1.3** `revalidate = 86400` ; owner preview via auth client

### 13.2 — Service (2 jours)

- [ ] **13.2.1** `(public)/[slug]/services/[serviceSlug]/page.tsx`
- [ ] **13.2.2** Composants : `EntityDetailBody`, `EntityMoreDetails`, `ProductFaq`, `ProductReviewsList`, `RelatedContent`

### 13.3 — APIs booking (1 jour) — AVANT la page booking

- [ ] **13.3.1** `api/bookings/available-days/route.ts`
- [ ] **13.3.2** `api/bookings/slots/route.ts`
- [ ] **13.3.3** `api/bookings/create/route.ts`

### 13.4 — Booking + confirmed (2 jours)

- [ ] **13.4.1** `BookingWidget.tsx` — port script inline `booking.astro` (~250 LOC JS)
- [ ] **13.4.2** `.../booking/page.tsx` + `.../confirmed/page.tsx`
- [ ] **13.4.3** `dynamic = 'force-dynamic'`

### 13.5 — Event (2 jours)

- [ ] **13.5.1** `(public)/[slug]/events/[eventSlug]/page.tsx`
- [ ] **13.5.2** Réutiliser composants 13.2 + inscription (`api/events/register`)

### 13.6 — Shop (3–4 jours) — le plus lourd

- [x] **13.6.1** `(public)/[slug]/shop/[productSlug]/page.tsx`
- [x] **13.6.2** `ProductDetail.tsx` — galerie, buybox, widgets, FAQ, avis
- [x] **13.6.3** `ProductSchemaJsonLd` → `generateMetadata`
- [ ] **13.6.4** Parité vs Astro sur les 3 breakpoints

**Livrable phase 13 :** toutes les pages détail + flow booking complet.

---

## Phase 14 — APIs restantes + Message (1 semaine)

### 14.0 — Navigation unifiée (pas de changement d’app)

> **Contexte :** tant que `NEXT_PUBLIC_WEB_URL` pointe vers Astro (`:4321`) ou que le studio ouvre des URLs absolues / `window.open`, un clic news/shop/service renvoie hors de Next.js. L’objectif est une navigation **100 % in-app** sur `apps/dashboard` — aucun saut vers `apps/web`.

- [x] **14.0.1** Fallbacks `NEXT_PUBLIC_WEB_URL ?? 'http://localhost:4321'` → `http://localhost:3000` (ou chemins relatifs `/${slug}/...`)
- [x] **14.0.2** Studio : `PublicationFeedCard`, `WidgetBodyDisplay`, `ProfileStudioSections` → liens relatifs in-app (supprimer `window.open` / `target="_blank"` vers Astro)
- [x] **14.0.3** `profile-studio-data.ts` : `webEditUrl` = chemin relatif `/${slug}` (pas host Astro)
- [x] **14.0.4** `GlobalHeader` : notifications → routes dashboard (`/notifications`), pas `${webUrl}` Astro
- [ ] **14.0.5** Vérifier `.env.local` : `NEXT_PUBLIC_WEB_URL=http://localhost:3000`

- [x] **14.1** `api/follow`, `api/unfollow`
- [x] **14.2** `api/comments` ✅ (déjà porté)
- [x] **14.3** `api/product-reviews`, `api/product-questions`
- [x] **14.4** `api/wishlist`
- [x] **14.5** `api/notifications/*` (mark-read, mark-all-read)
- [x] **14.6** `(public)/[slug]/message/page.tsx` + `api/entity-messages`
- [ ] **14.7** Tests E2E manuels : follow, commentaire, avis, wishlist

**Livrable phase 14 :** toutes les interactions visiteur fonctionnelles.

---

## Phase 15 — SEO infra + Cutover + Suppression Astro (1 semaine)

### 15.1 — SEO infra

- [x] **15.1.1** `app/sitemap.ts` — port `sitemap.xml.ts`
- [x] **15.1.2** `app/robots.ts` — port `robots.txt.ts`
- [x] **15.1.3** `app/llms.txt/route.ts`
- [x] **15.1.4** Vérifier toutes les `generateMetadata` (OG, canonical) — pages détail + accueil ; explore/notifications/booking en noindex

### 15.2 — Pre-cutover checklist

> Détail complet : [`docs/checklists/pre-cutover-15.2.md`](../checklists/pre-cutover-15.2.md)

- [x] Parité routes Astro → Next (audit code)
- [x] `revalidate` / `dynamic` par route (audit code)
- [x] Redirect owner + `?preview=1` (audit code)
- [x] `revalidatePath` / `getRevalidatePaths` (tests unitaires 3/3)
- [x] JSON-LD présent sur toutes les pages détail
- [ ] Toutes les pages sur URL preview Vercel — **bloqué : build TS studio en échec**
- [ ] Tests visuels 390 / 800 / 1200 sur chaque template
- [ ] Lighthouse ≥ 90 profil + shop + news
- [ ] JSON-LD validé Rich Results Test (manuel)
- [ ] Booking flow bout en bout (manuel)
- [ ] Aucune régression studio `/dashboard/site` (manuel après build vert)

### 15.3 — DNS cutover

- [ ] `ibee.fr` → Vercel
- [ ] Retirer Cloudflare Pages
- [ ] `NEXT_PUBLIC_WEB_URL` pointe vers prod Vercel
- [ ] Redirects 301 si nécessaire (`next.config.ts`)

### 15.4 — Nettoyage monorepo

- [ ] Supprimer `apps/web/`
- [ ] Supprimer `packages/ui-server/`
- [ ] Renommer optionnel : `apps/dashboard` → `apps/platform`, `@ibee/dashboard` → `@ibee/platform`
- [ ] Fusionner `packages/ui-react` → `packages/ui` (optionnel, même PR)
- [ ] Mettre à jour : `CLAUDE.md`, `apps/dashboard/CLAUDE.md`, `apps/web/CLAUDE.md` (supprimer), `.env.example`, `.ibee-brain/`, `turbo.json`, CI
- [ ] `pnpm deadcode` (knip) — retirer deps Astro

**Livrable phase 15 :** zero Astro, une app Next, prod sur Vercel.

---

## Ordre des PRs

| # | Branche | Contenu | Durée |
|---|---------|---------|-------|
| 1 | `chore/shared-extract` | `packages/shared` | 2h |
| 2 | `feat/cache-vercel-revalidate` | `cache.ts` + Server Actions | 4h |
| 3 | `feat/public-scaffold` | Route group `(public)`, tokens CSS | 1j |
| 4 | `feat/public-home-explore` | `/`, `/explore`, profile-preview, search API | 3j |
| 5 | `feat/public-notifications` | `/notifications` | 1j |
| 6 | `feat/public-profile` | `/[slug]` + composants profil | 5j |
| 7 | `feat/public-news-detail` | news + comments | 2j |
| 8 | `feat/public-service-detail` | service detail | 2j |
| 9 | `feat/api-bookings` | 3 Route Handlers | 1j |
| 10 | `feat/public-booking` | booking + confirmed + BookingWidget | 2j |
| 11 | `feat/public-event-detail` | event | 2j |
| 12 | `feat/public-shop-detail` | shop | 4j |
| 13 | `feat/public-apis-rest` | follow, comments, reviews, wishlist | 2j |
| 14 | `feat/public-message` | `/[slug]/message` | 1j |
| 15 | `feat/seo-infra` | sitemap, robots, llms | 1j |
| 16 | `chore/cutover-vercel` | DNS + vérif prod | 1j |
| 17 | `chore/remove-astro` | Suppression apps/web, ui-server | 2h |

Chaque PR = démo possible ; Astro reste en prod jusqu’à la PR 16.

---

## Checklist parité (validation continue)

### Visuel

- [ ] Hero visiteur : bannière, avatar, nom, rôle, bio, abonnés, CTAs
- [ ] Onglets : icône + label, actif accent, hash navigation
- [ ] Widgets accueil : cartes, empty states, carrousels
- [ ] Playlists : tuiles riches, badges, recherche shop
- [ ] Pages détail : top bar, strip entité, buybox, widgets, FAQ, avis
- [ ] Shell : header, sidebar, navpill identiques studio/public

### Comportement

- [ ] Owner `/{slug}` → redirect `/dashboard/site`
- [ ] `?preview=1` → profil public pour owner
- [ ] Follow / unfollow sans reload
- [ ] Commentaires news
- [ ] Booking calendrier → créneau → confirmation
- [ ] Explore search + preview panel
- [ ] Notifications mark-read
- [ ] Studio : aucune régression après chaque PR public

### Performance & SEO

- [ ] ISR `revalidate` sur routes publiques statiques
- [ ] `force-dynamic` sur routes auth
- [ ] `revalidatePath` après mutations studio
- [ ] Pas de `location.reload()` côté public
- [ ] Core Web Vitals stables vs Astro

---

## Pièges documentés

| Piège | Mitigation |
|-------|------------|
| `purgeEntityCache` Cloudflare inutile sur Vercel | Phase 10.2 — `revalidatePath` |
| `lucide-static` → `lucide-react` | Import composant, pas `set:html` |
| Fonts `@fontsource` vs `next/font` | Déjà OK dans dashboard — réutiliser |
| `?embed=true` sur layout public | Porter branche `AppLayout.astro` |
| `params` async Next 15+ | `const { slug } = await params` |
| Booking sans APIs | PR dédiée **avant** page booking |
| Porter overlays owner | **Ne pas** — déjà en studio React |
| Double maintenance CSS | `tokens.css` unique phase 10 |
| `profile-preview` | Page RSC `/profile-preview/[slug]`, pas API JSON |
| Shop `ProductDetail` XL | PR isolée, dernier dans phase 13 |

---

## Estimation

| Phase | Durée solo |
|-------|------------|
| 10 Fondations | 1 semaine |
| 11 Home / Explore / Notifs | 1 semaine |
| 12 Profil public | 1–2 semaines |
| 13 Pages détail | 2–3 semaines |
| 14 APIs + message | 1 semaine |
| 15 Cutover | 1 semaine |
| **Total** | **8–10 semaines** |

---

## Relation avec le plan phase 9

Le plan [`2026-06-09-migration-profil-owner-react.md`](./2026-06-09-migration-profil-owner-react.md) couvre le **studio owner** (phases 0–9). Ce document est la **suite officielle** (phases 10–15) pour **supprimer Astro**.

| Plan phase 9 | Statut |
|--------------|--------|
| 0–8 Studio | ✅ Fait |
| 9 Cutover owner Astro | ✅ Fait (redirect, APIs deprecated) |
| **10–15 Unification** | ⏳ Ce plan |

---

## Prochaine action immédiate

**PR #1 — `chore/shared-extract`** (2h, zéro risque) :

```bash
# 1. Créer packages/shared
# 2. Copier les .ts depuis ui-server/src/ (liste phase 10.1.2)
# 3. Réexport temporaire depuis ui-server
# 4. pnpm type-check && pnpm build
```

Puis **PR #2 — `feat/cache-vercel-revalidate`** avant tout portage de pages publiques.

---

## Références

- Document source : `2026-06-12-migration-astro-next-unifie.md` (racine repo)
- Doctrine actuelle : `CLAUDE.md` § Doctrine des surfaces
- Studio : `apps/dashboard/CLAUDE.md`
- Web Astro (référence portage) : `apps/web/CLAUDE.md`
