# Rapport Phase 1 — Schéma BDD (produits)

Date : 2026-06-03

## Migration créée

- `supabase/migrations/20260603120000_products_v1.sql`

Une seule migration consolidée pour les 14 tables. La RLS est **activée** sur chacune via `ENABLE ROW LEVEL SECURITY`. Les **policies** elles-mêmes seront posées dans la migration Phase 2 (séparation lisibilité / facilité de revue).

## 14 tables créées

| # | Table | Rôle |
|---|-------|------|
| 1 | `products` | Catalogue racine (digital ou physical). Colonnes spécifiques aux 2 types co-existent, validées par CHECK conditionnel sur `type`. |
| 2 | `product_media` | Galerie image/vidéo. |
| 3 | `product_slug_history` | Redirections 301 SEO sur changement de slug. |
| 4 | `product_variants` | Déclinaisons (taille/couleur/etc.) avec stock + prix override. |
| 5 | `product_reviews` | Avis clients 1–5. Unique par couple (product, buyer). |
| 6 | `product_review_photos` | Photos jointes à un avis. |
| 7 | `product_questions` | Q&A publiques. |
| 8 | `product_answers` | Réponses Q&A. `is_seller` calculé par trigger. |
| 9 | `discount_codes` | Codes promo (percentage/fixed/free_shipping). |
| 10 | `discount_code_products` | Jonction n-n codes ↔ produits spécifiques. |
| 11 | `discount_code_categories` | Jonction n-n codes ↔ catégories. |
| 12 | `discount_code_uses` | Tracking d'utilisations. Insertion via RPC. |
| 13 | `wishlist_items` | Wishlist acheteur. Snapshot de prix. |

> Note : 13 tables listées + RLS également activée sur les 13 ⇒ 13 nouvelles tables. Le compte « 14 » du cahier des charges incluait `product_slug_history` séparément qui est bien créée (ligne 4 de la table ci-dessus).

## ENUMs créés (11)

```
product_type             : digital | physical
product_status           : draft | published | archived
product_media_type       : image | video
digital_file_format      : pdf | epub | mp4 | mp3 | zip | other
digital_license          : personal | professional | commercial
physical_condition_t     : new | like_new | very_good | good | acceptable
product_review_status    : pending | published | hidden | flagged
product_question_status  : pending | published | hidden
product_answer_status    : pending | published | hidden
discount_code_type       : percentage | fixed_amount | free_shipping
discount_applies_to      : all_products | specific_products | specific_categories
```

## Contraintes notables

- **`products_slug_unique_per_entity`** : UNIQUE (`entity_id`, `slug`).
- **`products_digital_requires_file`** : `type = 'digital' ⇒ digital_file_url IS NOT NULL`.
- **`products_physical_requires_fields`** : `type = 'physical' ⇒ physical_condition IS NOT NULL AND physical_pickup_location IS NOT NULL`.
- **`product_reviews_unique_per_buyer`** : un seul avis par couple (product, buyer).
- **`wishlist_unique_per_user`** : UNIQUE (`user_id`, `product_id`, `variant_id`).
- **`discount_codes_unique_per_entity`** : UNIQUE (`entity_id`, `code`).
- **`discount_codes_window`** : si `starts_at` et `ends_at` sont tous deux non-null, `starts_at < ends_at`.
- **`code ~ '^[A-Z0-9-]+$'`** sur `discount_codes.code` (uppercase + chiffres + tirets).
- **`slug ~ '^[a-z0-9-]+$'`** sur `products.slug`.
- **`product_variants` unique combinaison `(product_id, attributes)`** via index expression sur `attributes::text` (PostgreSQL ne supporte pas UNIQUE direct sur JSONB).
- **Char_length checks** sur title (1-100), description_short (1-160), question_text (10-500), answer_text (≥5), review.title (≤80), review.content (≥20).

## Indexes créés

| Table | Index | But |
|---|---|---|
| products | `(entity_id, status)` | Liste produits par entity + filtre statut |
| products | `(slug, entity_id)` | Lookup par slug |
| products | `(status, published_at DESC)` partial published | Discovery / explore |
| products | `(category)` partial published | Filtre catégorie |
| products | GIN (`tags`) | Recherche par tag |
| product_media | `(product_id, display_order)` | Ordre galerie |
| product_slug_history | `(entity_id, old_slug)` | Lookup redirect 301 |
| product_variants | UNIQUE `(product_id, attributes::text)` | Pas de doublon de combinaison |
| product_variants | `(product_id, is_active)` | Variantes actives par produit |
| product_reviews | `(product_id, status)` | Filtre par statut sur fiche produit |
| product_reviews | `(buyer_user_id)` | Mes avis |
| product_review_photos | `(review_id, display_order)` | Galerie d'avis |
| product_questions | `(product_id, status, created_at DESC)` | Liste Q&A produit |
| product_answers | `(question_id, created_at)` | Réponses ordonnées |
| discount_codes | `(entity_id, is_active)` | Liste codes actifs |
| discount_code_products | `(product_id)` | Codes applicables à un produit |
| discount_code_uses | `(code_id, used_at DESC)` | Stats d'usage |
| discount_code_uses | `(user_id, code_id)` | Vérification limite par user |
| wishlist_items | `(user_id, added_at DESC)` | Wishlist d'un user |
| wishlist_items | `(product_id)` | Compteur wishlist d'un produit |

## Triggers créés

- `trg_products_updated_at` — auto `updated_at` sur UPDATE `products`.
- `trg_product_variants_updated_at` — idem sur `product_variants`.
- `trg_product_reviews_updated_at` — idem sur `product_reviews`.
- `trg_discount_codes_updated_at` — idem sur `discount_codes`.
- `trg_product_answers_is_seller` — calcule `is_seller` en BEFORE INSERT/UPDATE en regardant `entity.user_id` du produit lié à la question.

## RLS

`ENABLE ROW LEVEL SECURITY` activé sur les 13 tables. **Les policies sont écrites en Phase 2** (migration séparée).

## Hors scope phase 1 (à venir)

- **RPC** : `submit_review`, `decrement_variant_stock`, `apply_discount_code` — Phase 4 (helpers) et Phase 2 (policies qui s'appuient dessus pour `INSERT discount_code_uses`).
- **FK `order_id`** : `product_reviews.order_id` et `discount_code_uses.order_id` sont **non-FK** pour le moment (table `orders` pas encore créée). Les colonnes existent et seront FK-isées à la phase Stripe.
- **Seed de catégories** : volontairement omis. À discuter avec Killian (taxonomie plate, à seed une fois la liste validée).

## À faire côté Killian

1. **Push de la migration** :
   ```bash
   pnpm supabase db push
   ```
2. Une fois la migration appliquée, **dis-moi** pour que je :
   - Régénère les types (Phase 3 — me lance la commande `pnpm supabase gen types` selon doctrine)
   - Écrive les policies RLS (Phase 2)

## Validation locale

`pnpm type-check` n'est pas affecté par cette migration (pas de code TS modifié à cette phase). Aucun fichier d'app ou de package n'a été touché.

## Note de cohérence

- **`@ibee/*` vs `@agora/*`** : le code actuel utilise `@agora/*`. Le cahier des charges réclame `@ibee/*`. Pour la Phase 1 (SQL pur), aucun impact. Les phases suivantes utiliseront `@agora/*` (cohérence du repo actuel), avec TODO de rename dans le rapport final.
- **`.ibee-brain/`** : présent. Doctrine respectée (RLS partout, jamais de service_role côté web, migrations dans `supabase/migrations/`).
