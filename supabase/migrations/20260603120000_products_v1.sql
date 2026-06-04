-- ============================================================
-- Migration: products_v1
-- Feature: catalogue produits (digital + physical), variantes,
--          avis, Q&A, codes promo, wishlist
-- 14 tables. RLS activée. Voir migration suivante pour les
-- policies de modération avancées si besoin.
-- ============================================================

-- =====================
-- 1. Enums
-- =====================

CREATE TYPE product_type           AS ENUM ('digital', 'physical');
CREATE TYPE product_status         AS ENUM ('draft', 'published', 'archived');
CREATE TYPE product_media_type     AS ENUM ('image', 'video');
CREATE TYPE digital_file_format    AS ENUM ('pdf', 'epub', 'mp4', 'mp3', 'zip', 'other');
CREATE TYPE digital_license        AS ENUM ('personal', 'professional', 'commercial');
CREATE TYPE physical_condition_t   AS ENUM ('new', 'like_new', 'very_good', 'good', 'acceptable');
CREATE TYPE product_review_status  AS ENUM ('pending', 'published', 'hidden', 'flagged');
CREATE TYPE product_question_status AS ENUM ('pending', 'published', 'hidden');
CREATE TYPE product_answer_status  AS ENUM ('pending', 'published', 'hidden');
CREATE TYPE discount_code_type     AS ENUM ('percentage', 'fixed_amount', 'free_shipping');
CREATE TYPE discount_applies_to    AS ENUM ('all_products', 'specific_products', 'specific_categories');

-- =====================
-- 2. Table products
-- =====================

CREATE TABLE products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id uuid NOT NULL REFERENCES entity(id) ON DELETE CASCADE,
  type product_type NOT NULL,
  title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 100),
  slug text NOT NULL CHECK (slug ~ '^[a-z0-9-]+$'),
  description_short text NOT NULL CHECK (char_length(description_short) BETWEEN 1 AND 160),
  description_long text,
  category text NOT NULL,
  tags text[] NOT NULL DEFAULT '{}',
  price_cents integer NOT NULL CHECK (price_cents >= 0),
  currency text NOT NULL DEFAULT 'EUR',
  vat_rate numeric(5,2) CHECK (vat_rate IS NULL OR (vat_rate >= 0 AND vat_rate <= 100)),
  vat_included boolean NOT NULL DEFAULT true,
  status product_status NOT NULL DEFAULT 'draft',
  seo_title text,
  seo_description text,
  og_image_url text,
  published_at timestamptz,
  archived_at timestamptz,

  -- Digital
  digital_file_url text,
  digital_file_format digital_file_format,
  digital_file_size_bytes bigint CHECK (digital_file_size_bytes IS NULL OR digital_file_size_bytes >= 0),
  digital_preview_url text,
  digital_pages_or_duration integer CHECK (digital_pages_or_duration IS NULL OR digital_pages_or_duration >= 0),
  digital_language text DEFAULT 'fr',
  digital_license digital_license,

  -- Physical
  physical_condition physical_condition_t,
  physical_brand text,
  physical_color text,
  physical_size text,
  physical_material text,
  physical_weight_grams integer CHECK (physical_weight_grams IS NULL OR physical_weight_grams >= 0),
  physical_dimensions_cm jsonb,
  physical_stock_quantity integer DEFAULT 0 CHECK (physical_stock_quantity IS NULL OR physical_stock_quantity >= 0),
  physical_stock_unlimited boolean DEFAULT false,
  physical_pickup_location text,
  physical_pickup_instructions text,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT products_slug_unique_per_entity UNIQUE (entity_id, slug),

  -- Discriminés digital
  CONSTRAINT products_digital_requires_file CHECK (
    type <> 'digital' OR digital_file_url IS NOT NULL
  ),
  -- Discriminés physical
  CONSTRAINT products_physical_requires_fields CHECK (
    type <> 'physical' OR (
      physical_condition IS NOT NULL
      AND physical_pickup_location IS NOT NULL
    )
  )
);

COMMENT ON TABLE products IS 'Catalogue produits — digital (livré par lien R2 signé) ou physical (click & collect).';

CREATE INDEX idx_products_entity_status ON products (entity_id, status);
CREATE INDEX idx_products_slug_entity   ON products (slug, entity_id);
CREATE INDEX idx_products_published     ON products (status, published_at DESC NULLS LAST) WHERE status = 'published';
CREATE INDEX idx_products_category      ON products (category) WHERE status = 'published';
CREATE INDEX idx_products_tags          ON products USING GIN (tags);

-- updated_at trigger
CREATE OR REPLACE FUNCTION trg_products_set_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION trg_products_set_updated_at();

-- =====================
-- 3. Table product_media
-- =====================

CREATE TABLE product_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  url text NOT NULL,
  media_type product_media_type NOT NULL,
  alt_text text,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE product_media IS 'Galerie média (image/vidéo) d''un produit.';

CREATE INDEX idx_product_media_product_order ON product_media (product_id, display_order);

-- =====================
-- 4. Table product_slug_history (SEO redirects 301)
-- =====================

CREATE TABLE product_slug_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  entity_id uuid NOT NULL REFERENCES entity(id) ON DELETE CASCADE,
  old_slug text NOT NULL,
  new_slug text NOT NULL,
  changed_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE product_slug_history IS 'Historique des slugs pour redirect 301 SEO. Suit le pattern des autres *_slug_history.';

CREATE INDEX idx_product_slug_history_lookup ON product_slug_history (entity_id, old_slug);

-- =====================
-- 5. Table product_variants
-- =====================

CREATE TABLE product_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  attributes jsonb NOT NULL,
  stock_quantity integer NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
  price_cents_override integer CHECK (price_cents_override IS NULL OR price_cents_override >= 0),
  sku text,
  primary_image_url text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE product_variants IS 'Déclinaisons d''un produit (taille, couleur, etc.) avec stock + prix override.';

-- Unique combinaison (product_id, attributes) via expression index sur jsonb
CREATE UNIQUE INDEX idx_product_variants_unique ON product_variants (product_id, (attributes::text));
CREATE INDEX idx_product_variants_product_active ON product_variants (product_id, is_active);

CREATE OR REPLACE FUNCTION trg_product_variants_set_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_product_variants_updated_at
  BEFORE UPDATE ON product_variants
  FOR EACH ROW EXECUTE FUNCTION trg_product_variants_set_updated_at();

-- =====================
-- 6. Table product_reviews
-- =====================

CREATE TABLE product_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  variant_id uuid REFERENCES product_variants(id) ON DELETE SET NULL,
  buyer_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  order_id uuid, -- FK vers orders à ajouter quand la table existera
  rating smallint NOT NULL CHECK (rating BETWEEN 1 AND 5),
  title text CHECK (title IS NULL OR char_length(title) <= 80),
  content text NOT NULL CHECK (char_length(content) >= 20),
  status product_review_status NOT NULL DEFAULT 'pending',
  is_verified_purchase boolean NOT NULL DEFAULT false,
  seller_reply text,
  seller_replied_at timestamptz,
  helpful_count integer NOT NULL DEFAULT 0 CHECK (helpful_count >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  moderated_at timestamptz,

  -- Un seul avis par couple (product, buyer)
  CONSTRAINT product_reviews_unique_per_buyer UNIQUE (product_id, buyer_user_id)
);

COMMENT ON TABLE product_reviews IS 'Avis clients (1–5 étoiles + texte). is_verified_purchase à true si l''acheteur a une commande validée.';

CREATE INDEX idx_product_reviews_product_status ON product_reviews (product_id, status);
CREATE INDEX idx_product_reviews_buyer ON product_reviews (buyer_user_id);

CREATE OR REPLACE FUNCTION trg_product_reviews_set_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_product_reviews_updated_at
  BEFORE UPDATE ON product_reviews
  FOR EACH ROW EXECUTE FUNCTION trg_product_reviews_set_updated_at();

-- =====================
-- 7. Table product_review_photos
-- =====================

CREATE TABLE product_review_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id uuid NOT NULL REFERENCES product_reviews(id) ON DELETE CASCADE,
  url text NOT NULL,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE product_review_photos IS 'Photos jointes à un avis client.';

CREATE INDEX idx_product_review_photos_review ON product_review_photos (review_id, display_order);

-- =====================
-- 8. Table product_questions
-- =====================

CREATE TABLE product_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  asker_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question_text text NOT NULL CHECK (char_length(question_text) BETWEEN 10 AND 500),
  status product_question_status NOT NULL DEFAULT 'pending',
  helpful_count integer NOT NULL DEFAULT 0 CHECK (helpful_count >= 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE product_questions IS 'Q&A publiques posées sur la fiche produit.';

CREATE INDEX idx_product_questions_product_status ON product_questions (product_id, status, created_at DESC);

-- =====================
-- 9. Table product_answers
-- =====================

CREATE TABLE product_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id uuid NOT NULL REFERENCES product_questions(id) ON DELETE CASCADE,
  answerer_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  is_seller boolean NOT NULL DEFAULT false,
  answer_text text NOT NULL CHECK (char_length(answer_text) >= 5),
  status product_answer_status NOT NULL DEFAULT 'published',
  helpful_count integer NOT NULL DEFAULT 0 CHECK (helpful_count >= 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE product_answers IS 'Réponses Q&A. is_seller calculé par trigger (true si answerer = entity.user_id du produit).';

CREATE INDEX idx_product_answers_question ON product_answers (question_id, created_at);

-- Trigger : calcul de is_seller en regardant entity.user_id du produit lié à la question
CREATE OR REPLACE FUNCTION trg_product_answers_compute_is_seller() RETURNS trigger AS $$
DECLARE
  v_entity_user_id uuid;
BEGIN
  SELECT e.user_id INTO v_entity_user_id
  FROM product_questions q
  JOIN products p ON p.id = q.product_id
  JOIN entity   e ON e.id = p.entity_id
  WHERE q.id = NEW.question_id;

  NEW.is_seller := (v_entity_user_id IS NOT NULL AND v_entity_user_id = NEW.answerer_user_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_product_answers_is_seller
  BEFORE INSERT OR UPDATE OF answerer_user_id ON product_answers
  FOR EACH ROW EXECUTE FUNCTION trg_product_answers_compute_is_seller();

-- =====================
-- 10. Table discount_codes
-- =====================

CREATE TABLE discount_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id uuid NOT NULL REFERENCES entity(id) ON DELETE CASCADE,
  code text NOT NULL CHECK (code ~ '^[A-Z0-9-]+$'),
  type discount_code_type NOT NULL,
  value numeric(10,2) NOT NULL CHECK (value >= 0),
  min_purchase_cents integer CHECK (min_purchase_cents IS NULL OR min_purchase_cents >= 0),
  max_uses_total integer CHECK (max_uses_total IS NULL OR max_uses_total > 0),
  max_uses_per_user integer NOT NULL DEFAULT 1 CHECK (max_uses_per_user > 0),
  starts_at timestamptz,
  ends_at timestamptz,
  applies_to discount_applies_to NOT NULL DEFAULT 'all_products',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT discount_codes_unique_per_entity UNIQUE (entity_id, code),
  CONSTRAINT discount_codes_window CHECK (
    starts_at IS NULL OR ends_at IS NULL OR starts_at < ends_at
  )
);

COMMENT ON TABLE discount_codes IS 'Codes promo créés par l''entity. Validation côté checkout via RPC apply_discount_code.';

CREATE INDEX idx_discount_codes_entity_active ON discount_codes (entity_id, is_active);

CREATE OR REPLACE FUNCTION trg_discount_codes_set_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_discount_codes_updated_at
  BEFORE UPDATE ON discount_codes
  FOR EACH ROW EXECUTE FUNCTION trg_discount_codes_set_updated_at();

-- =====================
-- 11. Table discount_code_products
-- =====================

CREATE TABLE discount_code_products (
  code_id uuid NOT NULL REFERENCES discount_codes(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  PRIMARY KEY (code_id, product_id)
);

COMMENT ON TABLE discount_code_products IS 'Jonction n-n entre discount_codes (applies_to=specific_products) et products.';

CREATE INDEX idx_discount_code_products_product ON discount_code_products (product_id);

-- =====================
-- 12. Table discount_code_categories
-- =====================

CREATE TABLE discount_code_categories (
  code_id uuid NOT NULL REFERENCES discount_codes(id) ON DELETE CASCADE,
  category text NOT NULL,
  PRIMARY KEY (code_id, category)
);

COMMENT ON TABLE discount_code_categories IS 'Jonction n-n discount_codes (applies_to=specific_categories) ↔ catégories produit.';

-- =====================
-- 13. Table discount_code_uses
-- =====================

CREATE TABLE discount_code_uses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code_id uuid NOT NULL REFERENCES discount_codes(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  order_id uuid, -- FK vers orders à ajouter quand la table existera
  discount_amount_cents integer NOT NULL CHECK (discount_amount_cents >= 0),
  used_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE discount_code_uses IS 'Historique d''utilisations d''un code promo. Inséré uniquement via RPC apply_discount_code (SECURITY DEFINER).';

CREATE INDEX idx_discount_code_uses_code ON discount_code_uses (code_id, used_at DESC);
CREATE INDEX idx_discount_code_uses_user ON discount_code_uses (user_id, code_id);

-- =====================
-- 14. Table wishlist_items
-- =====================

CREATE TABLE wishlist_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  variant_id uuid REFERENCES product_variants(id) ON DELETE SET NULL,
  note text,
  price_cents_at_add integer CHECK (price_cents_at_add IS NULL OR price_cents_at_add >= 0),
  added_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT wishlist_unique_per_user UNIQUE (user_id, product_id, variant_id)
);

COMMENT ON TABLE wishlist_items IS 'Liste de souhaits acheteur. Snapshot price_cents_at_add permet d''afficher une baisse de prix.';

CREATE INDEX idx_wishlist_user ON wishlist_items (user_id, added_at DESC);
CREATE INDEX idx_wishlist_product ON wishlist_items (product_id);

-- =====================
-- RLS activation (policies dans la migration suivante phase 2)
-- =====================

ALTER TABLE products                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_media             ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_slug_history      ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_variants          ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_reviews           ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_review_photos     ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_questions         ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_answers           ENABLE ROW LEVEL SECURITY;
ALTER TABLE discount_codes            ENABLE ROW LEVEL SECURITY;
ALTER TABLE discount_code_products    ENABLE ROW LEVEL SECURITY;
ALTER TABLE discount_code_categories  ENABLE ROW LEVEL SECURITY;
ALTER TABLE discount_code_uses        ENABLE ROW LEVEL SECURITY;
ALTER TABLE wishlist_items            ENABLE ROW LEVEL SECURITY;
-- 13 tables ci-dessus + une (product_slug_history) = 14 au total.
