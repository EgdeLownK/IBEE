-- ============================================================
-- Migration: products_v2_form
-- Évolutions du schéma produits pour le formulaire multi-étapes
-- (décisions Killian 2026-06-04) :
--   1. bullet_points        — points principaux (étape 1)
--   2. sale_price_cents / sale_ends_at — promo directe prix barré
--   3. pickup_enabled / delivery_enabled — modes de remise cumulables
--   4. entity_product_categories — catégories "playlists" réutilisables
--   5. content_blocks       — description riche en blocs ordonnés
--      (remplace description_long dans le formulaire ; la colonne
--       description_long est conservée mais dépréciée)
-- ============================================================

-- ============================================================
-- 1. Points principaux (liste de puces, ≤ 100 caractères chacune —
--    longueur validée côté API, le CHECK garantit la forme tableau)
-- ============================================================
ALTER TABLE products
  ADD COLUMN bullet_points jsonb NOT NULL DEFAULT '[]'::jsonb
  CHECK (jsonb_typeof(bullet_points) = 'array');

COMMENT ON COLUMN products.bullet_points IS 'Points principaux du produit (array de strings, ≤100 caractères chacun, validé côté API).';

-- ============================================================
-- 2. Promo directe : prix barré + date de fin optionnelle
-- ============================================================
ALTER TABLE products
  ADD COLUMN sale_price_cents integer,
  ADD COLUMN sale_ends_at timestamptz;

ALTER TABLE products
  ADD CONSTRAINT products_sale_price_valid CHECK (
    sale_price_cents IS NULL
    OR (sale_price_cents >= 0 AND sale_price_cents < price_cents)
  );

COMMENT ON COLUMN products.sale_price_cents IS 'Prix promo (barré). NULL = pas de promo. Toujours < price_cents.';
COMMENT ON COLUMN products.sale_ends_at IS 'Fin de la promo. NULL = sans date de fin.';

-- ============================================================
-- 3. Modes de remise (physical) : click-and-collect et/ou livraison
--    La livraison est déclarative à ce stade (frais + expédition
--    réelle viendront avec la phase Stripe/checkout).
-- ============================================================
ALTER TABLE products
  ADD COLUMN pickup_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN delivery_enabled boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN products.pickup_enabled IS 'Click-and-collect actif (physical). Le lieu de retrait devient requis si actif.';
COMMENT ON COLUMN products.delivery_enabled IS 'Livraison déclarée possible (physical). Déclaratif jusqu''à la phase Stripe.';

-- Le lieu de retrait n'est plus requis que si le click-and-collect
-- est actif, et un physical doit avoir au moins un mode de remise.
ALTER TABLE products DROP CONSTRAINT products_physical_requires_fields;
ALTER TABLE products
  ADD CONSTRAINT products_physical_requires_fields CHECK (
    type <> 'physical' OR (
      physical_condition IS NOT NULL
      AND (pickup_enabled OR delivery_enabled)
      AND (NOT pickup_enabled OR physical_pickup_location IS NOT NULL)
    )
  );

-- ============================================================
-- 4. Catégories "playlists" — réutilisables par entity,
--    créables à la volée depuis le formulaire.
-- ============================================================
CREATE TABLE entity_product_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id uuid NOT NULL REFERENCES entity(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 60),
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT entity_product_categories_unique_name UNIQUE (entity_id, name)
);

COMMENT ON TABLE entity_product_categories IS 'Catégories de boutique façon playlists : réutilisées si existantes, créées à la volée sinon.';

CREATE INDEX idx_entity_product_categories_entity ON entity_product_categories (entity_id, position);

CREATE TRIGGER trg_entity_product_categories_updated_at
  BEFORE UPDATE ON entity_product_categories
  FOR EACH ROW EXECUTE FUNCTION trg_products_set_updated_at();

ALTER TABLE entity_product_categories ENABLE ROW LEVEL SECURITY;

-- Lecture publique (les catégories d'une boutique sont des données publiques)
CREATE POLICY "entity_product_categories_public_select"
  ON entity_product_categories FOR SELECT
  TO anon, authenticated
  USING (true);

-- CRUD owner
CREATE POLICY "entity_product_categories_owner_insert"
  ON entity_product_categories FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM entity WHERE id = entity_id AND user_id = auth.uid())
  );

CREATE POLICY "entity_product_categories_owner_update"
  ON entity_product_categories FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM entity WHERE id = entity_id AND user_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM entity WHERE id = entity_id AND user_id = auth.uid())
  );

CREATE POLICY "entity_product_categories_owner_delete"
  ON entity_product_categories FOR DELETE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM entity WHERE id = entity_id AND user_id = auth.uid())
  );

-- Rattachement des produits à une catégorie (nullable : produits sans catégorie OK)
ALTER TABLE products
  ADD COLUMN category_id uuid REFERENCES entity_product_categories(id) ON DELETE SET NULL;

CREATE INDEX idx_products_category_id ON products (category_id) WHERE status = 'published';

-- L'ancienne colonne texte libre est dépréciée (le formulaire V2 utilise category_id).
ALTER TABLE products ALTER COLUMN category DROP NOT NULL;
ALTER TABLE products ALTER COLUMN category SET DEFAULT '';
COMMENT ON COLUMN products.category IS 'DÉPRÉCIÉE — remplacée par category_id (entity_product_categories). Conservée pour compat.';

-- ============================================================
-- 5. Description riche en blocs ordonnés (étape 3 du formulaire)
--    Forme : [{ "type": "text", "content": "..." } | { "type": "image", "url": "...", "alt": "..." }]
-- ============================================================
ALTER TABLE products
  ADD COLUMN content_blocks jsonb NOT NULL DEFAULT '[]'::jsonb
  CHECK (jsonb_typeof(content_blocks) = 'array');

COMMENT ON COLUMN products.content_blocks IS 'Blocs texte/image ordonnés composant la description riche. Remplace description_long (dépréciée).';
COMMENT ON COLUMN products.description_long IS 'DÉPRÉCIÉE — remplacée par content_blocks. Conservée pour compat.';
