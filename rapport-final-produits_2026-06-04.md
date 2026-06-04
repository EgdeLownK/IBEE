# Rapport final — Feature Produits V1 + Formulaire V2 (IBEE)

Date : 2026-06-04 (mis à jour après le chantier "Formulaire produit V2")

## ⭐ Addendum — Chantier Formulaire produit V2 (même session)

Sur décisions Killian (vision "une seule surface : le profil"), le parcours de création a été refondu :

**Migration `20260604150000_products_v2_form`** (appliquée, vérifiée en prod) :
- `products` : + `bullet_points` (points principaux), + `sale_price_cents`/`sale_ends_at` (promo prix barré), + `pickup_enabled`/`delivery_enabled` (modes de remise physical cumulables — livraison déclarative jusqu'à Stripe, décision Killian), + `category_id`, + `content_blocks` (description riche en blocs)
- Nouvelle table `entity_product_categories` (catégories "playlists" réutilisables, créables à la volée) — RLS : lecture publique, CRUD owner (4 policies)
- `category` (texte) et `description_long` dépréciées, conservées pour compat
- ⚠️ L'enregistrement d'historique de cette migration reste à coller par Killian (3 lignes INSERT fournies dans le chat)

**Overlay de création multi-étapes** (`ProductCreateOverlay.astro`, vanilla JS pur) :
- Étape 0 : choix du type (physique/numérique) seul à l'écran
- Étape 1 : médias ≤10 dont 1 vidéo max (durée ≤3 min et ≤1080p validées côté client avant upload), titre, points principaux (≤8 ×100 car., compteurs), prix + promo dépliable (prix promo + date de fin), catégorie-playlist (réutiliser ou créer), bloc digital (fichier/format/licence) ou modes de remise (physical)
- Étape 2 (physical uniquement, le digital la saute) : quantité, état, variantes flexibles (multi-attributs, SKU/prix/stock par variante)
- Étape 3 : éditeur de blocs texte/image réordonnables (≤20) + toggle "Publier immédiatement"
- Erreurs serveur remappées vers la bonne étape et le bon champ

**API** : `POST /api/products` étendu (payload V2 complet + `variants` ≤20 créées via helper), `POST /api/product-upload` accepte la vidéo (mp4/webm ≤200 Mo), nouveau helper `product-categories.ts` (list/getOrCreate/delete)

**Fiche publique V2** : prix barré + "-X %" + échéance, points principaux, badges retrait/livraison, vidéo dans la galerie, blocs riches ordonnés (fallback description_long), catégorie — JSON-LD à jour (prix promo + `priceValidUntil`, `VideoObject`, zéro propriété nulle). Choix notable : la promo s'applique au prix de base uniquement (masquée quand une variante avec prix propre est sélectionnée).

**Vérifications V2** : type-check 0 erreur (36 fichiers), build vert, tests verts, knip propre, garde-fou tables OK, smoke test home + shop 200.

**Suivi restant** : prix barré non affiché dans le ShopWidget de la home (conflit de fichiers entre agents parallèles — trivial, à faire) ; UX fine de l'overlay à retravailler avec Killian (annoncé).

---
Chantier : catalogue produits (digital + physical click-and-collect), avis, Q&A, codes promo, wishlist.

---

## 0. Pré-requis traités en début de chantier

- **Rename `@agora/*` → `@ibee/*`** : 64 fichiers (5 `package.json`, tous les imports, `astro.config.mjs` `ssr.noExternal`, `next.config.ts` `transpilePackages`, règles `.claude`), lockfile régénéré via `pnpm install`. Les documents datés (`etat-stack_2026-05-07.md`, `rapport-phase-1_2026-06-03.md`) ont été volontairement laissés en l'état (snapshots historiques).
- **Réparation de l'historique des migrations Supabase** : 16 versions manquantes (avril → juin, appliquées via SQL Editor sans enregistrement) insérées dans `supabase_migrations.schema_migrations`. L'historique remote (20 versions) est désormais aligné avec `supabase/migrations/` (20 fichiers). `db push` est de nouveau utilisable.

## 1. Migrations (ordre d'application)

| Version | Nom | État |
|---|---|---|
| `20260603120000` | `products_v1` — 11 ENUMs, 13 tables, indexes, 5 triggers, RLS activée | ✅ appliquée (SQL Editor) |
| `20260604000000` | `products_v1_policies` — 55 policies RLS | ✅ appliquée (SQL Editor) + enregistrée dans l'historique |

## 2. Tables × RLS (13 tables, 55 policies — vérifiées en prod via `pg_policies`)

| Table | Policies | Modèle d'accès |
|---|---|---|
| `products` | 5 | public si `published` ; owner CRUD complet |
| `product_media` | 4 | public si produit published ; owner CRUD |
| `product_slug_history` | 4 | public si produit published ; owner CRUD |
| `product_variants` | 4 | public si produit published ; owner CRUD |
| `product_reviews` | 6 | public si `published` ; buyer CRUD sur les siens ; owner SELECT tout (modération lecture) |
| `product_review_photos` | 4 | public si avis published ; buyer CRUD |
| `product_questions` | 5 | public si `published` ; auteur SELECT/INSERT/DELETE ; owner SELECT tout |
| `product_answers` | 5 | public si `published` ; auteur SELECT/INSERT/DELETE ; owner SELECT tout |
| `discount_codes` | 4 | owner uniquement — jamais énumérables publiquement |
| `discount_code_products` | 4 | owner uniquement |
| `discount_code_categories` | 4 | owner uniquement |
| `discount_code_uses` | 2 | SELECT owner + self ; **aucune écriture client** (réservée RPC) |
| `wishlist_items` | 4 | self uniquement |

**Choix de sécurité structurant** : aucune policy `UPDATE owner` sur avis/questions/réponses — Postgres ne sait pas restreindre un UPDATE par colonne via RLS, et une telle policy aurait permis au vendeur de réécrire le contenu/la note d'un avis client. La modération passera par des RPC `SECURITY DEFINER` (voir §10).

## 3. Types

`packages/supabase/src/types.ts` régénéré depuis la prod (+717 lignes, purement additif). Les 13 tables + 11 ENUMs produits sont typés et consommés via `Database` depuis `@ibee/supabase`.

## 4. Helpers (`packages/supabase/src/`, 45 fonctions, exportées via le barrel)

| Fichier | Fonctions |
|---|---|
| `products.ts` (15) | `getPublishedProductBySlug`, `listPublishedProductsByEntity`, `lookupProductSlugHistory`, `getProductById`, `listProductsByEntity`, `createProduct`, `updateProduct` (+ insertion slug_history sur changement de slug), `deleteProduct`, `addProductMedia`, `removeProductMedia`, `reorderProductMedia`, `listProductVariants`, `createProductVariant`, `updateProductVariant`, `deleteProductVariant` |
| `product-reviews.ts` (9) | `listPublishedReviews` (filtres note, tri), `getReviewAggregates`, `getMyReview`, `createReview`, `updateMyReview`, `deleteMyReview`, `addReviewPhotos`, `removeReviewPhoto`, `listReviewsForModeration` |
| `product-qa.ts` (7) | `listPublishedQuestions`, `askQuestion`, `deleteMyQuestion`, `answerQuestion`, `deleteMyAnswer`, `listQuestionsForModeration`, `listAnswersForModeration` |
| `discount-codes.ts` (8) | `listDiscountCodes`, `getDiscountCodeById`, `createDiscountCode`, `updateDiscountCode`, `deleteDiscountCode`, `setDiscountCodeProducts`, `setDiscountCodeCategories`, `listDiscountCodeUses` |
| `wishlist.ts` (6) | `getMyWishlist`, `isInWishlist`, `addToWishlist`, `removeFromWishlist`, `toggleWishlist`, `updateWishlistNote` |

Garde-fous intégrés : `status` non exposé à la création d'avis/questions (défaut DB `pending` — pas d'auto-publication) ; `.is('variant_id', null)` pour les lookups wishlist sans variante (NULL ≠ NULL en Postgres).

## 5. Server actions (`apps/dashboard/.../products/actions.ts`)

- **`productSchema`** : discriminated union Zod sur `type` — `digital` (digital_file_url URL requise, format, license) / `physical` (condition, pickup_location requis, stock ≥ 0). Communs : title 1-100, slug `^[a-z0-9-]+$` (slugifié du titre si absent), description_short 1-160, price_cents > 0, currency, category, tags, status.
- Actions : `createProductAction`, `updateProductAction`, `deleteProductAction`, `setProductStatusAction`, `saveProductMediaAction`, `createVariantAction`, `updateVariantAction`, `deleteVariantAction`, `createDiscountCodeAction`, `updateDiscountCodeAction`, `deleteDiscountCodeAction`.
- Pattern uniforme : auth → safeParse → `getEntityByUserId` → helper → `purgeEntityCache` → `revalidatePath`. Collisions slug/code (unique par entity) → erreur de champ propre (détection Postgres 23505).
- `ensureShopSectionActive` (copie du pattern news) : active la section `shop` du profil à la première publication.

## 6. Routes dashboard

```
/dashboard/site/products            Liste (tous statuts, filtres, statut inline, suppression)
/dashboard/site/products/new        Création (formulaire adaptatif digital/physical)
/dashboard/site/products/[id]/edit  Édition (champs + galerie + variantes + statut)
/dashboard/site/products/codes      Codes promo (CRUD + associations produits/catégories)
/dashboard/site/products/community  Modération avis + questions — LECTURE SEULE (RPC à venir)
```

Sidebar : l'entrée `shop` "Boutique" préexistante (désactivée, route morte) a été réutilisée → "Produits", activée.

## 7. Routes publiques (apps/web)

```
/[slug]/shop                        Grille produits publiés + JSON-LD ItemList
/[slug]/shop/[productSlug]          Fiche produit (404 ou redirect 301 via slug_history)
/api/wishlist                       POST toggle (auth visiteur)
/api/product-reviews                POST/PATCH/DELETE avis
/api/product-questions              POST/DELETE questions + réponses
```

Intégrations : `ShopWidget` de la home branché sur les vrais produits (6 max + lien boutique), tab `shop` de `MenuTabs` → navigation réelle vers `/[slug]/shop`.

## 8. Composants UI

| Emplacement | Composants |
|---|---|
| `packages/ui-server` (Astro, zéro React) | `ProductCard`, `ProductDetail` (galerie, sélecteur variantes vanilla JS, wishlist optimistic, CTA "Bientôt disponible", blocs digital/click-and-collect), `ProductReviewsList` (distribution, filtres/tri serveur, formulaire), `ProductQAList` (badge Vendeur), `ProductSchemaJsonLd` |
| `packages/ui-react` | — (aucun nouveau : doctrine "sans auth → Astro, HTML pur" — l'interactivité publique est en vanilla JS, pattern follow/comments) |
| `apps/dashboard` (locaux) | `ProductsHome`, `ProductForm`, `VariantsEditor` (stock inline + toggle actif), `DiscountCodesHome`, `CommunityModeration` |

**JSON-LD** (pilier SEO/GEO/AEO) : `Product` racine, `offers`/`AggregateOffer` selon variantes, `availability` selon stock, `itemCondition` mappé depuis `physical_condition`, `aggregateRating` + échantillon `review[]`, `additionalType: DigitalDocument` pour le digital.

## 9. Vérifications effectuées

| Check | Résultat |
|---|---|
| `pnpm type-check` | ✅ 0 erreur (5 packages) |
| `pnpm build` | ✅ web + dashboard |
| `pnpm test` | ✅ Vitest passe |
| `pnpm deadcode` (knip) | ✅ aucun ajout en code mort lié au chantier (`ActionResult` exporté = convention existante du repo) |
| `from('product*'\|'discount_*'\|'wishlist_*')` dans `apps/` | ✅ zéro — tout passe par `@ibee/supabase` |
| RLS activée + policies en prod | ✅ vérifié via `pg_class` / `pg_policies` (13 tables, 55 policies) |
| Historique migrations aligné | ✅ 20 versions remote = 20 fichiers locaux |
| Formulaire création + fiche publique en local | ⏳ **validation visuelle Killian requise** (voir ci-dessous) |

**Procédure de validation navigateur** : `pnpm dev` → `localhost:3000/dashboard/site/products` → créer un produit (un digital, un physical), publier → `localhost:4321/<slug>/shop` et la fiche. Vérifier aussi : sélecteur de variantes, tab Boutique du profil, sidebar "Produits".

## 10. Limitations connues / dette assumée

**Phase RPC (prochaine étape naturelle)** — migration `SECURITY DEFINER` à créer :
- `moderate_product_review` / `moderate_product_question` / `moderate_product_answer` — débloque les boutons de la page community
- `submit_review` (vérification d'achat → `is_verified_purchase`) — dépend de `orders` (Stripe)
- `apply_discount_code` + `decrement_variant_stock` — dépendent du checkout (Stripe)

**Bug d'environnement dev découvert (préexistant au chantier, à traiter à part)** : en dev local, l'émulateur Cloudflare (`miniflare 4.20260409` via `@cloudflare/vite-plugin 1.3`) crashe en "fetch failed" (500) lorsqu'une route API renvoie une réponse **non-2xx** (401/400…). Les routes elles-mêmes répondent correctement (visible dans les logs vite : `[401] POST /api/follow 5ms`). Touche TOUTES les routes API (`follow`, `comments`, `wishlist`, `products`…). Diagnostic : route `ping` minimale, 200 passe / 401 crashe, avec ou sans Content-Type. Conséquence dev-only : les erreurs de validation des formulaires s'affichent en "Erreur réseau" générique au lieu des messages par champ. Piste : upgrade `@cloudflare/vite-plugin` / `@astrojs/cloudflare`.

**Dette technique assumée :**
- `product_reviews.order_id` / `discount_code_uses.order_id` sans FK (table `orders` à venir avec Stripe)
- Pas de bucket Storage `product-media` : les images produits réutilisent le bucket `publication-media`
- Tests Vitest des 45 helpers : différés en phase tests dédiée (décision Killian 2026-06-04)
- Pas de `purgeProductCache` dans `cache.ts` (seul cas impacté : réponse Q&A publiée immédiatement)
- Grille shop sans prix "à partir de" (nécessiterait un helper listant les variantes en masse)
- Pas de seed de catégories (taxonomie à valider avec Killian)
- État du cœur wishlist non resynchronisé au changement de variante sur la fiche
- Fichier agent `.claude/agents/agora-supabase.md` : contenu renommé `@ibee/*` mais le nom de fichier/agent reste "agora"
- `CLAUDE.md` racine pointe vers `.agora-brain/` alors que le dossier réel est `.ibee-brain/` (drift préexistant au chantier)

**Chantier UX futur acté (décision Killian 2026-06-04)** — "édition in-profil" : le CTA owner "Ajouter un produit" du profil doit à terme ouvrir un **overlay de création** dans la page profil (et non renvoyer au dashboard), dans la continuité de l'édition inline du chantier profile-hero (bannière, sections). Même chantier : rendre le profil visible non connecté avec données mock + CTA s'inscrire/se connecter (profil démo). À cadrer en tenant compte de la doctrine `_BRAIN-DEV.md` "sans auth → Astro HTML pur" (tension à arbitrer : formulaire en double vs page publique alourdie en JS). En attendant, le CTA pointe vers `dashboard/site/products`.

**Divergence assumée vs cahier des charges initial** : le cahier prévoyait des composants React (`ProductVariantSelector.tsx`, `WishlistButton.tsx`, `ProductReviewForm.tsx`) dans `apps/web`. Le repo réel n'a pas d'intégration React côté Astro et la doctrine du brain est explicite ("sans auth → Astro, HTML pur, aucune exception") — ces interactions sont implémentées en vanilla JS dans les composants Astro, comme follow/commentaires.

## 11. Recommandation de découpage Git

La branche `feat/profile-hero-design` porte 3 chantiers sans rapport : profile-hero (non commité, antérieur), rename `@ibee`, et produits. Recommandation : commits atomiques séparés (1. profile-hero, 2. rename, 3. produits) — idéalement le rename en PR dédiée pour une revue lisible.
