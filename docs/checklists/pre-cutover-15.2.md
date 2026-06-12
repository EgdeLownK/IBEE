# Checklist 15.2 — Pre-cutover (migration Astro → Next)

> **Date :** 2026-06-09  
> **App :** `apps/dashboard` (preview Vercel cible)  
> **Référence :** [plan migration](../plans/2026-06-12-migration-astro-next-unifie.md#152--pre-cutover-checklist)

Légende : ✅ vérifié auto/code | 🔲 à faire manuellement | ⚠️ bloquant avant cutover

---

## 1. Parité routes Astro → Next

| Route Astro | Route Next | Statut |
|-------------|------------|--------|
| `/` | `(public)/page.tsx` | ✅ |
| `/explore` | `(public)/explore/page.tsx` | ✅ |
| `/notifications` | `(public)/notifications/page.tsx` | ✅ (stub contenu) |
| `/profile-preview/[slug]` | `(public)/profile-preview/[slug]/page.tsx` | ⚠️ stub simplifié |
| `/[slug]` | `(public)/[slug]/page.tsx` | ✅ |
| `/[slug]/news/[publicationSlug]` | `(public)/[slug]/news/[publicationSlug]/page.tsx` | ✅ |
| `/[slug]/services/[serviceSlug]` | `(public)/[slug]/services/[serviceSlug]/page.tsx` | ✅ |
| `/[slug]/services/.../booking` | `.../booking/page.tsx` | ✅ `force-dynamic` |
| `/[slug]/services/.../confirmed` | `.../confirmed/page.tsx` | ✅ `force-dynamic` |
| `/[slug]/shop/[productSlug]` | `(public)/[slug]/shop/[productSlug]/page.tsx` | ✅ |
| `/[slug]/events/[eventSlug]` | `(public)/[slug]/events/[eventSlug]/page.tsx` | ✅ |
| `/[slug]/message` | `(public)/[slug]/message/page.tsx` | ✅ |
| `/[slug]/informations` | redirect → `/dashboard/site/general` | ✅ `next.config.ts` |
| `sitemap.xml` / `robots.txt` / `llms.txt` | `app/sitemap.ts`, `robots.ts`, `llms.txt/route.ts` | ✅ phase 15.1 |

---

## 2. Cache & rendu (`revalidate` / `dynamic`)

| Route | Config attendue | Fichier | Statut |
|-------|-----------------|---------|--------|
| `/` | `revalidate = 300` | `(public)/page.tsx` | ✅ |
| `/explore` | `revalidate = 300`, noindex | `explore/page.tsx` | ✅ |
| `/notifications` | `force-dynamic`, noindex | `notifications/page.tsx` | ✅ |
| `/[slug]` | `revalidate = 86400`, `?preview=1` → `noStore()` | `[slug]/page.tsx` | ✅ |
| News / service / shop / event | `revalidate = 86400`, preview → `noStore()` | pages détail | ✅ |
| Event (auth) | `user \|\| preview` → `noStore()` | `events/.../page.tsx` | ✅ |
| Booking + confirmed | `force-dynamic` | `booking` + `confirmed` | ✅ |
| Message | `revalidate = 86400` | `message/page.tsx` | ✅ |
| Sitemap | `revalidate = 300` | `app/sitemap.ts` | ✅ |

---

## 3. Redirects owner & preview

| Scénario | Comportement attendu | Statut |
|----------|----------------------|--------|
| Owner visite `/{slug}` | Redirect `/dashboard/site` | ✅ code `[slug]/page.tsx` |
| Owner + `?preview=1` | Profil public (noStore) | ✅ |
| Owner sur `/{slug}/message` | Redirect `/dashboard/site` | ✅ |
| Shop ancien slug | `permanentRedirect` 301 | ✅ |
| Messagerie désactivée | Redirect `/{slug}` | ✅ |

🔲 **Test manuel :** connecté en owner → `http://localhost:3000/{slug}` → doit arriver sur `/dashboard/site`.  
🔲 **Test manuel :** `http://localhost:3000/{slug}?preview=1` → profil public visible.

---

## 4. `revalidatePath` après mutations studio

| Action | Helper | Statut |
|--------|--------|--------|
| Menu sections, hero | `revalidateAfterEntityMutation` | ✅ `actions.ts` |
| Publications | + `publicationSlug` | ✅ `publication-actions.ts` |
| Produits | + `productSlug` | ✅ `product-actions.ts` |
| Services | + `serviceSlug` | ✅ `service-actions.ts` |
| Events | + `eventSlug` | ✅ `event-actions.ts` |
| FAQ, contact, history, widgets | profil + `/dashboard/site` | ✅ |
| Profil général / bannière | + `/dashboard/site/general` | ✅ `entity-profile-actions.ts` |
| Commentaires / follow API | `revalidatePublicPaths` | ✅ |

**Tests unitaires :** `packages/supabase` → `getRevalidatePaths` — ✅ 3/3 passent.

🔲 **Test manuel :** publier une news en studio → recharger `/{slug}` (après revalidate) → la news apparaît.

---

## 5. JSON-LD (Rich Results)

| Page | Composant | Statut code |
|------|-----------|-------------|
| Profil `/{slug}` | `ProfileJsonLd` | ✅ |
| News | `PublicationArticleJsonLd` | ✅ |
| Service | `ServiceSchemaJsonLd` | ✅ |
| Shop | `ProductSchemaJsonLd` | ✅ |
| Event | `EventSchemaJsonLd` | ✅ |

🔲 **Validation :** [Google Rich Results Test](https://search.google.com/test/rich-results) sur URLs preview :
- `/{slug}`
- `/{slug}/news/{publicationSlug}`
- `/{slug}/shop/{productSlug}`

---

## 6. APIs publiques portées

| API | Route Next | Statut |
|-----|------------|--------|
| Search | `api/search` | ✅ |
| Comments | `api/comments` | ✅ |
| Follow / unfollow | `api/follow`, `api/unfollow` | ✅ |
| Wishlist | `api/wishlist` | ✅ |
| Product reviews / questions | `api/product-reviews`, `api/product-questions` | ✅ |
| Bookings | `api/bookings/*` | ✅ |
| Event register | `api/events/register` | ✅ |
| Entity messages | `api/entity-messages` | ✅ |
| Notifications | `api/notifications/mark-read`, `mark-all-read` | ✅ |

---

## 7. Build & déploiement preview Vercel

| Vérification | Résultat (2026-06-09) |
|--------------|------------------------|
| `pnpm run build` (dashboard) | ⚠️ **ÉCHEC** — erreurs TS studio (préexistantes) |
| Compile Turbopack | ✅ OK avant phase typecheck |
| Tests `getRevalidatePaths` | ✅ 3/3 |

### Bloquants build identifiés

1. `entity-profile-actions.ts` — `banner_url` absent des types Supabase générés (migration SQL existe)
2. `home-widgets-actions.ts` — enum widget `widget_faq` vs types DB
3. `ProfileStudio.tsx` / `AddContentDialog.tsx` — types publications / wizards produit
4. `BookingPage.tsx` — prop `title` manquante sur `DetailEntityStrip`
5. `PublicProfileHome.tsx` — type `productCategories`

🔲 **Avant cutover :** regénérer types Supabase (`banner_url`) + corriger les erreurs TS studio → build vert sur Vercel.

🔲 **Preview Vercel :** déployer branche actuelle et parcourir toutes les URLs du tableau §1.

---

## 8. Tests visuels (390 / 800 / 1200 px)

Templates à valider côte à côte Astro (prod) vs Next (preview) :

| Template | Breakpoints | Statut |
|----------|-------------|--------|
| Profil `/{slug}` | 390 / 800 / 1200 | 🔲 |
| News détail | 390 / 800 / 1200 | 🔲 |
| Service détail | 390 / 800 / 1200 | 🔲 |
| Shop détail | 390 / 800 / 1200 | 🔲 |
| Event détail | 390 / 800 / 1200 | 🔲 |
| Booking flow | mobile + desktop | 🔲 |
| Shell (header / sidebar / navpill) | 390 / 1200 | 🔲 |
| Studio `/dashboard/site` | 800 / 1200 | 🔲 |

**Outil :** DevTools responsive ou Playwright screenshots.

---

## 9. Lighthouse (cible ≥ 90)

| URL | Performance | SEO | Statut |
|-----|-------------|-----|--------|
| `/{slug}` (profil) | — | — | 🔲 |
| `/{slug}/news/...` | — | — | 🔲 |
| `/{slug}/shop/...` | — | — | 🔲 |

🔲 Lancer Lighthouse (Chrome) ou `npx lighthouse <url> --only-categories=performance,seo`.

---

## 10. Booking flow bout en bout

| Étape | Statut |
|-------|--------|
| Page service → CTA Réserver | ✅ lien `.../booking` |
| `GET api/bookings/available-days` | ✅ |
| `GET api/bookings/slots` | ✅ |
| `POST api/bookings/create` | ✅ |
| Page confirmed + services reco | ✅ |

🔲 **Test manuel E2E :**
1. `/{slug}/services/{serviceSlug}` → Réserver
2. Choisir date + créneau + remplir formulaire
3. Confirmer → URL `.../confirmed?booking_id=...`
4. Vérifier email / entrée BDD si configuré

---

## 11. Comportements interactifs (phase 14)

| Feature | Statut code | Test manuel |
|---------|-------------|-------------|
| Suivre / ne plus suivre | ✅ `PublicProfileHero` + APIs | 🔲 |
| Commentaires news | ✅ | 🔲 |
| Avis produit (pending) | ✅ API | 🔲 |
| Wishlist | ✅ API | 🔲 UI produit à brancher si absent |
| Notifications mark-read | ✅ API + header actions | 🔲 |
| Navigation in-app (pas :4321) | ✅ phase 14.0 | 🔲 |

---

## 12. Studio — régression `/dashboard/site`

| Zone | Statut |
|------|--------|
| Hero éditable (avatar, bannière, bio) | ✅ code (build TS ⚠️) |
| Onglets + sections | ✅ |
| Wizards produit / service / event | ⚠️ TS partiel |
| Widgets home | ⚠️ enum `widget_faq` |
| Publications feed | ✅ navigation relative Next |

🔲 Parcours manuel complet owner après correction build.

---

## 13. Navigation unifiée (14.0)

| Item | Statut |
|------|--------|
| Liens studio relatifs `/{slug}/...` | ✅ |
| `PublicationFeedCard` sans `window.open` Astro | ✅ |
| `GlobalHeader` → `/notifications`, `/explore` | ✅ |
| `.env.local` `NEXT_PUBLIC_WEB_URL=http://localhost:3000` | 🔲 à confirmer par dev |

---

## Synthèse go / no-go cutover

| Critère | Prêt ? |
|---------|--------|
| Routes publiques portées | ✅ |
| SEO infra (sitemap, robots, llms) | ✅ |
| ISR / dynamic configurés | ✅ |
| APIs visiteur | ✅ |
| **Build production vert** | ⚠️ **NON** |
| Tests visuels / Lighthouse | 🔲 |
| Preview Vercel validée | 🔲 |
| DNS / suppression Astro | 🔲 phase 15.3–15.4 |

**Verdict :** migration fonctionnelle côté public ; **cutover bloqué** tant que le build TS studio n’est pas vert et que les tests manuels §8–§11 ne sont pas passés sur preview Vercel.

---

## Commandes utiles

```bash
# Build (doit passer avant cutover)
cd apps/dashboard && pnpm run build

# Tests revalidate paths
cd packages/supabase && pnpm test -- cache.test

# Dev local
cd apps/dashboard && pnpm dev
# Profil : http://localhost:3000/{slug}
# Studio : http://localhost:3000/dashboard/site
```
