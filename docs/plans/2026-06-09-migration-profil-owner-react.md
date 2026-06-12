# Migration profil owner Astro → Dashboard React (ultra-fidèle)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reproduire à l’identique (pixel + comportement) l’expérience owner actuelle sur `localhost:4321/{slug}` dans `apps/dashboard`, en React, sans `location.reload()`, puis retirer toute édition owner de la page publique Astro.

**Architecture:** Deux surfaces séparées — **Renderer public** (Astro SSR, cache CDN, zéro JS owner) et **Studio owner** (Next.js App Router, Server Components pour le data-fetch, Client Components pour l’interactivité, Server Actions pour les mutations). Logique métier partagée dans `@ibee/supabase` + modules TS extraits de `ui-server`. Design system : tokens de `apps/web/src/styles/global.css` portés dans `apps/dashboard/src/app/globals.css` + composants `@ibee/ui-react`.

**Tech Stack:** Next.js 16, React 19, Server Actions, `@ibee/supabase`, `lucide-react`, `sonner`, Tailwind v4, Supabase Storage (uploads).

**Principe fidélité:** Chaque phase se valide par **capture visuelle côte à côte** (studio React vs profil Astro actuel) + checklist comportementale avant de passer à la suivante.

---

## État actuel (référence)

| Surface | URL | Rôle |
|---------|-----|------|
| Studio (référence design) | `http://localhost:4321/{slug}` | WYSIWYG owner complet (~12k LOC overlays Astro) |
| Public | même URL, visiteur | SSR SEO |
| Dashboard | `http://localhost:3000/dashboard/site` | Coquille partielle (menu onglets seulement) |

**Volume à porter:** 7 overlays XL/L, 15+ composants owner, 11 routes API web → Server Actions dashboard.

---

## Architecture cible

```
apps/dashboard/
  src/app/dashboard/
    layout.tsx              # Header studio + auth
    site/
      page.tsx              # RSC : fetch owner data (miroir [slug].astro)
      actions.ts            # Server Actions (mutations)
      loading.tsx
  src/components/profile-studio/
    ProfileStudioShell.tsx  # Client : tab state, layout 800px
    ProfileHeroEditor.tsx
    ProfileMenuTabs.tsx     # ✅ existe (ProfileStudioMenuTabs)
    HomeWidgetsPanel.tsx
    overlays/               # 1 fichier React par overlay Astro
  src/lib/
    profile-studio-data.ts  # fetch owner (réutilise @ibee/supabase)

packages/
  shared/                   # NOUVEAU (ou packages/core)
    home-widget-config.ts   # déplacé depuis ui-server
    history-blocks.ts
    faq-items.ts
    widget-display-content.ts
    widget-empty-content.ts
    banner-image-crop.ts

apps/web/
  [slug].astro              # PUBLIC ONLY (plus de isOwner, plus d’overlays)
  profile-preview/[slug]    # Aperçu visiteur (inchangé)
```

**Règle brain:** Sans auth → Astro. Avec auth + édition → Next.js. **Aucune exception.**

---

## Stratégie de fidélité visuelle

### Phase 0 — Design system parity (bloquant)

- [ ] **0.1** Copier/aligner les tokens `@theme` profil depuis `apps/web/src/styles/global.css` → `apps/dashboard/src/app/globals.css` (accent, neutral, radius, shadows, fonts Poppins/Inter).
- [ ] **0.2** Créer `packages/ui-react/src/profile/` avec primitives miroir :
  - `ProfileShell` (`.profile-shell`, max 800px)
  - `ProfileButton` (`.btn`, variants dark/ghost/accent)
  - `ProfileSegTab` (`.segtab`, `.is-active`)
  - `ProfileTile` (`.tile`, `.tile--rich`, badges prix/brouillon)
  - `ProfileEmptyState` (icône + CTA)
  - `ProfileOverlay` (dialog modal centré, backdrop blur — style AddContent)
- [ ] **0.3** Storybook ou page `/dashboard/dev/ui` avec chaque primitive vs capture Astro (optionnel mais recommandé).
- [ ] **0.4** Documenter la grille de référence : hero 800px, padding sections `22px`, playlists full-bleed mobile `<1024px`.

### Règle de portage CSS

1. Lire le `<style>` scoped de chaque `.astro` source.
2. Traduire en classes Tailwind + variables CSS existantes (pas de hex hardcodé).
3. Valider sur 3 breakpoints : 390px, 800px, 1200px.

---

## Stratégie data & mutations

### Fetch owner (miroir `[slug].astro`)

Server Component `dashboard/site/page.tsx` charge en `Promise.all` :

- `getEntityByUserId`, `getEntityMenuSections`, `listMenuSectionStates`
- `getEntityHomeWidgets`, `getEntityHistory`, `getEntityContactInfo`, `getEntityFaq`
- `getPublicationsByEntity({ publicOnly: false })`
- `listProductsByEntity` (auth), `listProductCategories`
- `listUpcomingEventsForOwner` (auth)
- Agrégats avis produits/services

### Mutations → Server Actions uniquement

| Astro API actuelle | Server Action dashboard |
|------------------|-------------------------|
| `POST/DELETE menu-sections` | ✅ `addMenuSectionAction`, `removeMenuSectionAction` |
| `home-widgets` CRUD | `createHomeWidgetAction`, `updateHomeWidgetAction`, `reorderHomeWidgetsAction`, `deleteHomeWidgetAction` |
| `publications` POST | `createPublicationAction` |
| `products` POST | `createProductAction` |
| `services` POST | `createServiceAction` |
| `events` POST | `createEventAction` |
| `entity-history` PATCH | `saveHistoryBlocksAction` |
| `entity-faq` PATCH | `saveFaqItemsAction` |
| `entity-contact-info` PATCH | `saveContactInfoAction` |
| `product-upload` POST | `uploadMediaAction` (FormData) ou signed URL Supabase |

Chaque action : `purgeEntityCache(slug, siteUrl)` en fire-and-forget (ne pas bloquer la réponse UI).

### Rafraîchissement UI (zéro reload)

- `useOptimistic` + `useTransition` pour mutations locales.
- `revalidatePath('/dashboard/site')` en arrière-plan si besoin de resync SSR.
- Pas de `location.reload()` — jamais.

---

## Mapping composant par composant

### Shell & navigation

| Astro source | React cible | Complexité | Notes fidélité |
|--------------|-------------|------------|----------------|
| `ProfileCard.astro` | `ProfileShell.tsx` | S | max-width 800px, shadow desktop |
| `ProfilePage.astro` (orchestration) | `ProfileStudioShell.tsx` | M | tab state, montage sections |
| `MenuTabs.astro` (owner) | `ProfileMenuTabs.tsx` | S | ✅ base existante, enrichir styles Astro |
| Tab script inline | state `activeTab` + `useEffect` hash | S | `#home`, `replaceState` |

### Hero

| Astro | React | Complexité |
|-------|-------|------------|
| `ProfileHero.astro` | `ProfileHeroEditor.tsx` | M |
| Popover bannière/avatar | `HeroBannerMenu`, `HeroAvatarMenu` | M |
| Upload stub | `AvatarCropperModal` + upload Server Action | M |
| Bouton « Ajouter contenu » | ouvre `AddContentOverlay` React | — |
| « Modifier profil » | route `/dashboard/site/general` (ex-informations) | M |

### Stories

| `ProfileStories.astro` | `ProfileStoriesStrip.tsx` | S | backend absent → garder stub fidèle |

### Accueil — widgets

| Astro | React | Complexité |
|-------|-------|------------|
| `HomeWidgetsSection.astro` | `HomeWidgetsPanel.tsx` | L |
| `WidgetCard.astro` | `WidgetCard.tsx` | M |
| `HomeWidgetRenderer.astro` | `WidgetRenderer.tsx` | M |
| `WidgetEmptyState.astro` | `WidgetEmptyState.tsx` | S |
| `HomeWidgetConfigOverlay.astro` (~2328 LOC) | `HomeWidgetConfigDialog.tsx` | **XL** |
| Widgets affichage (Shop, News, Bio…) | composants read-only React | M chacun |

### Sections onglets (playlists)

| Astro | React | Complexité |
|-------|-------|------------|
| `PublicationsList` + `PublicationCard` | `PublicationsFeed.tsx` | M |
| `ShopPlaylist.astro` | `ShopPlaylist.tsx` | M |
| `ServicePlaylist.astro` | `ServicePlaylist.tsx` | M |
| `EventPlaylist.astro` | `EventPlaylist.tsx` | M |
| `HistoryWidget` + edit btn | `HistorySection.tsx` | S |

### Overlays création / édition

| Astro (~LOC) | React | Complexité | Priorité |
|--------------|-------|------------|----------|
| `AddContentOverlay` (1226) | `AddContentDialog.tsx` | **L** | Phase 4 |
| `ProductCreateOverlay` (2679) | `ProductCreateWizard.tsx` | **XL** | Phase 6 |
| `ServiceCreateOverlay` (1618) | `ServiceCreateWizard.tsx` | **XL** | Phase 7 |
| `EventCreateOverlay` (1529) | `EventCreateWizard.tsx` | **XL** | Phase 7 |
| `HistoryEditOverlay` (2250) | `HistoryEditDialog.tsx` | **XL** | Phase 5 |
| `FaqEditOverlay` (592) | `FaqEditDialog.tsx` | **M** | Phase 3 |
| `AuthPromptOverlay` | `AuthPromptDialog.tsx` | S | si besoin visiteur dans studio |

### Flux « Ajouter contenu » (fidélité stricte)

Reproduire exactement :

1. Modal centré LinkedIn (header avatar + nom + fermeture)
2. Toolbar : **News** en premier, sélectionné par défaut
3. Composer news : placeholder « Quelle actu souhaitez-vous partager ? », emoji, image, vidéo 5 min, sondage, miniatures 50×50 horizontales réordonnables
4. Clic Produit/Service/Event/Histoire → ferme AddContent, ouvre overlay enfant
5. Bouton **Retour** (pas Annuler) si ouvert depuis AddContent → rouvre AddContent
6. Globals : remplacer `window.__ibeeReturnToAddContent` par React Context `AddContentNavigationContext`

---

## Phases d’implémentation

### Phase 1 — Fondations studio (semaine 1)

**Livrable:** `/dashboard/site` affiche le profil owner complet en lecture + onglets instantanés + lien aperçu public.

- [ ] **1.1** Extraire modules TS vers `packages/shared` (home-widget-config, history-blocks, faq-items, widget-*, banner-image-crop).
- [ ] **1.2** `profile-studio-data.ts` : fetch owner identique à `[slug].astro`.
- [ ] **1.3** `ProfileStudioShell` : layout 800px, sections conditionnelles par menu actif.
- [ ] **1.4** Porter `ProfileHero` en lecture (sans upload) — fidélité visuelle.
- [ ] **1.5** Porter `HomeWidgetsSection` en **lecture seule** (pas encore CRUD).
- [ ] **1.6** Porter playlists shop/service/event/news en lecture (badges brouillon owner).
- [ ] **1.7** Header dashboard : « Voir le profil public » → `NEXT_PUBLIC_WEB_URL/{slug}` (nouvel onglet).
- [ ] **1.8** Login redirect → `/dashboard/site` (plus vers web).
- [ ] **1.9** Checklist visuelle phase 1 (captures 390/800/1200).

### Phase 2 — Widgets accueil CRUD (semaine 2–3)

**Livrable:** Ajout, config, réordonnancement, suppression widgets — sans reload.

- [ ] **2.1** Server Actions home-widgets (4 opérations).
- [ ] **2.2** `HomeWidgetsPanel` : menu « Ajouter un widget » (7 types, règles single-instance FAQ/bio).
- [ ] **2.3** `WidgetCard` : menu ⋮ monter/descendre/modifier/supprimer (optimistic).
- [ ] **2.4** `HomeWidgetConfigDialog` par type (shop picker, bio contact, announcement crop…) — **plus gros morceau**.
- [ ] **2.5** Tests manuels : chaque type widget + empty states + titres numérotés (Shop 2, etc.).

### Phase 3 — FAQ + contact bio (semaine 3)

- [ ] **3.1** `FaqEditDialog` (miroir FaqEditOverlay).
- [ ] **3.2** Intégration widget FAQ → ouverture dialog depuis WidgetCard.
- [ ] **3.3** Section contact/horaires dans config bio widget.

### Phase 4 — News / Add content (semaine 4)

- [ ] **4.1** `AddContentDialog` shell + toolbar types.
- [ ] **4.2** Composer news complet (réutiliser `UploadPublicationImages` + étendre vidéo).
- [ ] **4.3** `createPublicationAction`.
- [ ] **4.4** Navigation Retour vers AddContent depuis overlays enfants (Context).
- [ ] **4.5** `PublicationsFeed` avec refresh optimiste après publish.

### Phase 5 — Histoire (semaine 5)

- [ ] **5.1** Porter `banner-image-crop.ts` (déjà TS pur).
- [ ] **5.2** `HistoryEditDialog` : blocs texte/image, réordonnancement, crop.
- [ ] **5.3** `saveHistoryBlocksAction`.

### Phase 6 — Produit (semaine 6–7)

- [ ] **6.1** Découper wizard en steps React (`ProductCreateWizard/Step*.tsx`).
- [ ] **6.2** Porter validation client (miroir `products.ts`).
- [ ] **6.3** `createProductAction` + `uploadMediaAction` + entity-files.
- [ ] **6.4** Tests : physical + digital, variantes, médias, brouillon/publish.

### Phase 7 — Service + Event (semaine 7–8)

- [ ] **7.1** `ServiceCreateWizard` (3 étapes).
- [ ] **7.2** `EventCreateWizard` (2 étapes).
- [ ] **7.3** Server Actions respectives.

### Phase 8 — Hero upload + général (semaine 8)

- [ ] **8.1** Upload avatar/bannière (`AvatarCropperModal`).
- [ ] **8.2** Page `/dashboard/site/general` (remplace `informations.astro`).
- [ ] **8.3** Server Actions entity profile fields.

### Phase 9 — Finitions & cutover (semaine 9)

- [ ] **9.1** `PublicationCard` : edit/delete/associate (câbler APIs manquantes).
- [ ] **9.2** Parité 100 % checklist (voir ci-dessous).
- [ ] **9.3** `[slug].astro` : retirer `isOwner`, overlays, fetch owner, redirect owner → dashboard.
- [ ] **9.4** Supprimer scripts owner de `MenuTabs.astro` web (visiteur only).
- [ ] **9.5** Déprécier routes API web owner (garder temporairement pour rollback).
- [ ] **9.6** Mettre à jour `.ibee-brain` + `CLAUDE.md` (doctrine surfaces).

---

## Checklist parité 100 % (validation cutover)

### Visuel
- [ ] Hero : bannière, avatar, nom, rôle, lieu, bio, compteur abonnés, boutons owner
- [ ] Onglets : icône + label, état actif (texte accent, pas de fond)
- [ ] Widgets accueil : cartes, empty states gris, menu ⋮
- [ ] Playlists : tuiles riches, badges promo/brouillon/stock, recherche shop
- [ ] Overlays : dimensions, arrondis 18px, toolbar LinkedIn AddContent
- [ ] Composer news : miniatures 50×50, placeholder FR

### Comportement
- [ ] Ajout onglet < 100 ms perçu (optimistic)
- [ ] Add content → Produit → Retour → Add content
- [ ] Publication news avec image + vidéo + sondage
- [ ] Widget reorder sans reload
- [ ] Création produit brouillon visible dans playlist
- [ ] Aperçu public ouvre la page Astro visiteur identique

### Performance
- [ ] Aucun `location.reload()` dans le studio
- [ ] `purgeEntityCache` non bloquant
- [ ] Pas de fetch redondant au clic (optimistic first)

---

## Risques & mitigations

| Risque | Mitigation |
|--------|------------|
| 12k LOC → dérive visuelle | Phase 0 DS + validation capture à chaque phase |
| Wizards XL (produit) | Découper en steps + tests par étape |
| Double maintenance Astro/React | Cutover brutal phase 9, pas de coexistence longue |
| Upload cross-app | Server Actions FormData dans dashboard uniquement |
| `ProfileHeroReact` obsolète | Réécrire `ProfileHeroEditor` depuis Astro, pas depuis React legacy |

---

## Ordre recommandé des PRs (petites, reviewables)

1. `feat/shared-profile-modules` — extraction TS
2. `feat/dashboard-ds-primitives` — ui-react profile primitives
3. `feat/dashboard-studio-shell` — layout + fetch + lecture seule
4. `feat/dashboard-home-widgets` — CRUD widgets
5. `feat/dashboard-add-content-news` — composer news
6. `feat/dashboard-history-faq` — dialogs édition
7. `feat/dashboard-product-wizard` — création produit
8. `feat/dashboard-service-event-wizard`
9. `feat/dashboard-hero-upload-general`
10. `feat/web-public-only-cutover` — retrait owner Astro

Chaque PR = démo possible sur `/dashboard/site` sans casser le studio Astro tant que phase 9 non mergée.

---

## Ce qui reste sur Astro (après cutover)

- `/{slug}` visiteur : SSR, cache CDN, Schema.org, follow/unfollow
- Pages détail produit/service/event/news
- `profile-preview/{slug}` si utile
- APIs publiques (comments, bookings visiteur, search…)

**Plus jamais sur Astro :** overlays owner, `isOwner`, fetch brouillons, `Cache-Control: private` sur profil owner.

---

## Estimation

| Phase | Effort |
|-------|--------|
| 0 DS | 2–3 j |
| 1 Shell | 3–4 j |
| 2 Widgets | 5–7 j |
| 3 FAQ/contact | 2 j |
| 4 News | 4–5 j |
| 5 Histoire | 4–5 j |
| 6 Produit | 7–10 j |
| 7 Service+Event | 6–8 j |
| 8 Hero+général | 3 j |
| 9 Cutover | 2–3 j |
| **Total** | **~6–9 semaines** (solo, une phase à la fois) |

---

## Prochaine action immédiate

Démarrer **Phase 0 + Phase 1** dans une branche `feat/dashboard-profile-studio` :

1. Extraire `packages/shared`
2. Aligner tokens CSS dashboard
3. Afficher le profil owner en lecture seule dans `/dashboard/site` avec fidélité visuelle hero + widgets + playlists

Le studio Astro sur `:4321` reste la **référence** jusqu’à la phase 9.
