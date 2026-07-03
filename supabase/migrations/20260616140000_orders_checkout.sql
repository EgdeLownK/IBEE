-- ============================================================
-- Migration: orders_checkout
-- Commandes boutique + checkout Stripe (fondation Phase B)
-- ============================================================

-- =====================
-- 1. Enums
-- =====================

CREATE TYPE order_status AS ENUM (
  'pending',
  'paid',
  'failed',
  'cancelled',
  'refunded',
  'partially_refunded'
);

CREATE TYPE order_fulfillment_status AS ENUM (
  'not_applicable',
  'pending',
  'to_ship',
  'ready',
  'shipped',
  'delivered',
  'returned'
);

-- Analytics funnel checkout
ALTER TYPE analytics_event_type ADD VALUE IF NOT EXISTS 'checkout_started';
ALTER TYPE analytics_event_type ADD VALUE IF NOT EXISTS 'checkout_completed';

-- =====================
-- 2. Séquence numéros de commande
-- =====================

CREATE SEQUENCE IF NOT EXISTS order_number_seq START 1;

-- =====================
-- 3. Table orders
-- =====================

CREATE TABLE orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id uuid NOT NULL REFERENCES entity(id) ON DELETE CASCADE,
  order_number text NOT NULL UNIQUE,
  buyer_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  buyer_email text,
  buyer_name text,
  status order_status NOT NULL DEFAULT 'pending',
  fulfillment_status order_fulfillment_status NOT NULL DEFAULT 'pending',
  subtotal_cents integer NOT NULL CHECK (subtotal_cents >= 0),
  discount_cents integer NOT NULL DEFAULT 0 CHECK (discount_cents >= 0),
  shipping_cents integer NOT NULL DEFAULT 0 CHECK (shipping_cents >= 0),
  total_cents integer NOT NULL CHECK (total_cents >= 0),
  refund_cents integer NOT NULL DEFAULT 0 CHECK (refund_cents >= 0),
  currency text NOT NULL DEFAULT 'EUR',
  stripe_checkout_session_id text UNIQUE,
  stripe_payment_intent_id text,
  shipping_address jsonb,
  tracking_number text,
  tracking_carrier text,
  notes text,
  paid_at timestamptz,
  cancelled_at timestamptz,
  refunded_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE orders IS 'Commandes boutique — créées au checkout, finalisées via webhook Stripe.';

CREATE INDEX idx_orders_entity_status_paid ON orders (entity_id, status, paid_at DESC NULLS LAST);
CREATE INDEX idx_orders_buyer ON orders (buyer_user_id, created_at DESC) WHERE buyer_user_id IS NOT NULL;
CREATE INDEX idx_orders_stripe_session ON orders (stripe_checkout_session_id) WHERE stripe_checkout_session_id IS NOT NULL;

CREATE OR REPLACE FUNCTION trg_orders_set_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION trg_orders_set_updated_at();

-- =====================
-- 4. Table order_lines
-- =====================

CREATE TABLE order_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  variant_id uuid REFERENCES product_variants(id) ON DELETE SET NULL,
  quantity integer NOT NULL CHECK (quantity > 0),
  unit_price_cents integer NOT NULL CHECK (unit_price_cents >= 0),
  line_total_cents integer NOT NULL CHECK (line_total_cents >= 0),
  title_snapshot text NOT NULL,
  variant_snapshot jsonb,
  product_type product_type NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE order_lines IS 'Lignes de commande avec snapshots prix/titre au moment de l''achat.';

CREATE INDEX idx_order_lines_order ON order_lines (order_id);
CREATE INDEX idx_order_lines_product ON order_lines (product_id);

-- =====================
-- 5. FK différées (produits v1)
-- =====================

ALTER TABLE product_reviews
  ADD CONSTRAINT product_reviews_order_id_fkey
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL;

ALTER TABLE discount_code_uses
  ADD CONSTRAINT discount_code_uses_order_id_fkey
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL;

-- =====================
-- 6. Helpers internes
-- =====================

CREATE OR REPLACE FUNCTION generate_order_number() RETURNS text AS $$
DECLARE
  v_seq bigint;
BEGIN
  v_seq := nextval('order_number_seq');
  RETURN 'CMD-' || lpad(v_seq::text, 6, '0');
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION resolve_product_unit_price_cents(
  p_product products,
  p_variant product_variants DEFAULT NULL
) RETURNS integer AS $$
DECLARE
  v_base integer;
BEGIN
  IF p_product.sale_price_cents IS NOT NULL
     AND (p_product.sale_ends_at IS NULL OR p_product.sale_ends_at > now()) THEN
    v_base := p_product.sale_price_cents;
  ELSE
    v_base := p_product.price_cents;
  END IF;

  IF p_variant IS NOT NULL AND p_variant.price_cents_override IS NOT NULL THEN
    RETURN p_variant.price_cents_override;
  END IF;

  RETURN v_base;
END;
$$ LANGUAGE plpgsql STABLE;

CREATE OR REPLACE FUNCTION assert_product_in_stock(
  p_product products,
  p_variant product_variants,
  p_quantity integer
) RETURNS void AS $$
BEGIN
  IF p_product.type = 'digital' THEN
    RETURN;
  END IF;

  IF p_variant IS NOT NULL THEN
    IF p_variant.stock_quantity < p_quantity THEN
      RAISE EXCEPTION 'stock_insufficient' USING ERRCODE = 'P0001';
    END IF;
    RETURN;
  END IF;

  IF COALESCE(p_product.physical_stock_unlimited, false) THEN
    RETURN;
  END IF;

  IF COALESCE(p_product.physical_stock_quantity, 0) < p_quantity THEN
    RAISE EXCEPTION 'stock_insufficient' USING ERRCODE = 'P0001';
  END IF;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION decrement_stock_for_line(
  p_product products,
  p_variant_id uuid,
  p_quantity integer
) RETURNS void AS $$
BEGIN
  IF p_product.type = 'digital' THEN
    RETURN;
  END IF;

  IF p_variant_id IS NOT NULL THEN
    UPDATE product_variants
    SET stock_quantity = stock_quantity - p_quantity
    WHERE id = p_variant_id
      AND stock_quantity >= p_quantity;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'stock_decrement_failed' USING ERRCODE = 'P0001';
    END IF;
    RETURN;
  END IF;

  IF COALESCE(p_product.physical_stock_unlimited, false) THEN
    RETURN;
  END IF;

  UPDATE products
  SET physical_stock_quantity = physical_stock_quantity - p_quantity
  WHERE id = p_product.id
    AND physical_stock_quantity >= p_quantity;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'stock_decrement_failed' USING ERRCODE = 'P0001';
  END IF;
END;
$$ LANGUAGE plpgsql;

-- =====================
-- 7. RPC checkout (SECURITY DEFINER)
-- =====================

CREATE OR REPLACE FUNCTION create_checkout_order(
  p_entity_id uuid,
  p_product_id uuid,
  p_variant_id uuid DEFAULT NULL,
  p_quantity integer DEFAULT 1,
  p_buyer_user_id uuid DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_product products%ROWTYPE;
  v_variant product_variants%ROWTYPE;
  v_unit_price integer;
  v_line_total integer;
  v_order_id uuid;
  v_fulfillment order_fulfillment_status;
BEGIN
  IF p_quantity IS NULL OR p_quantity < 1 THEN
    RAISE EXCEPTION 'invalid_quantity' USING ERRCODE = 'P0001';
  END IF;

  SELECT * INTO v_product
  FROM products
  WHERE id = p_product_id
    AND entity_id = p_entity_id
    AND status = 'published';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'product_not_found' USING ERRCODE = 'P0001';
  END IF;

  IF p_variant_id IS NOT NULL THEN
    SELECT * INTO v_variant
    FROM product_variants
    WHERE id = p_variant_id
      AND product_id = p_product_id
      AND is_active = true;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'variant_not_found' USING ERRCODE = 'P0001';
    END IF;
  ELSE
    v_variant := NULL;
  END IF;

  PERFORM assert_product_in_stock(v_product, v_variant, p_quantity);

  v_unit_price := resolve_product_unit_price_cents(v_product, v_variant);
  v_line_total := v_unit_price * p_quantity;

  v_fulfillment := CASE
    WHEN v_product.type = 'digital' THEN 'not_applicable'::order_fulfillment_status
    ELSE 'pending'::order_fulfillment_status
  END;

  INSERT INTO orders (
    entity_id,
    order_number,
    buyer_user_id,
    status,
    fulfillment_status,
    subtotal_cents,
    total_cents,
    currency
  ) VALUES (
    p_entity_id,
    generate_order_number(),
    p_buyer_user_id,
    'pending',
    v_fulfillment,
    v_line_total,
    v_line_total,
    COALESCE(v_product.currency, 'EUR')
  )
  RETURNING id INTO v_order_id;

  INSERT INTO order_lines (
    order_id,
    product_id,
    variant_id,
    quantity,
    unit_price_cents,
    line_total_cents,
    title_snapshot,
    variant_snapshot,
    product_type
  ) VALUES (
    v_order_id,
    p_product_id,
    p_variant_id,
    p_quantity,
    v_unit_price,
    v_line_total,
    v_product.title,
    CASE WHEN p_variant_id IS NOT NULL THEN v_variant.attributes ELSE NULL END,
    v_product.type
  );

  RETURN v_order_id;
END;
$$;

COMMENT ON FUNCTION create_checkout_order IS
  'Crée une commande pending + ligne avant redirection Stripe Checkout.';

CREATE OR REPLACE FUNCTION attach_stripe_session_to_order(
  p_order_id uuid,
  p_stripe_session_id text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE orders
  SET stripe_checkout_session_id = p_stripe_session_id
  WHERE id = p_order_id
    AND status = 'pending';
END;
$$;

CREATE OR REPLACE FUNCTION complete_checkout_order(
  p_stripe_session_id text,
  p_payment_intent_id text DEFAULT NULL,
  p_buyer_email text DEFAULT NULL,
  p_buyer_name text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order orders%ROWTYPE;
  v_line order_lines%ROWTYPE;
  v_product products%ROWTYPE;
BEGIN
  SELECT * INTO v_order
  FROM orders
  WHERE stripe_checkout_session_id = p_stripe_session_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'order_not_found' USING ERRCODE = 'P0001';
  END IF;

  IF v_order.status = 'paid' THEN
    RETURN v_order.id;
  END IF;

  IF v_order.status <> 'pending' THEN
    RAISE EXCEPTION 'order_not_pending' USING ERRCODE = 'P0001';
  END IF;

  FOR v_line IN
    SELECT * FROM order_lines WHERE order_id = v_order.id
  LOOP
    SELECT * INTO v_product FROM products WHERE id = v_line.product_id;
    PERFORM decrement_stock_for_line(v_product, v_line.variant_id, v_line.quantity);
  END LOOP;

  UPDATE orders
  SET
    status = 'paid',
    stripe_payment_intent_id = COALESCE(p_payment_intent_id, stripe_payment_intent_id),
    buyer_email = COALESCE(p_buyer_email, buyer_email),
    buyer_name = COALESCE(p_buyer_name, buyer_name),
    paid_at = now(),
    fulfillment_status = CASE
      WHEN fulfillment_status = 'not_applicable' THEN 'delivered'::order_fulfillment_status
      ELSE fulfillment_status
    END
  WHERE id = v_order.id;

  RETURN v_order.id;
END;
$$;

COMMENT ON FUNCTION complete_checkout_order IS
  'Finalise une commande payée (webhook Stripe) et décrémente le stock.';

GRANT EXECUTE ON FUNCTION create_checkout_order(uuid, uuid, uuid, integer, uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION attach_stripe_session_to_order(uuid, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION complete_checkout_order(text, text, text, text) TO service_role;

-- =====================
-- 8. RLS
-- =====================

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_lines ENABLE ROW LEVEL SECURITY;

-- Buyer : ses commandes
CREATE POLICY orders_buyer_select
  ON orders FOR SELECT
  TO authenticated
  USING (buyer_user_id = auth.uid());

-- Owner vendeur
CREATE POLICY orders_owner_select
  ON orders FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM entity WHERE id = entity_id AND user_id = auth.uid())
  );

CREATE POLICY orders_owner_update
  ON orders FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM entity WHERE id = entity_id AND user_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM entity WHERE id = entity_id AND user_id = auth.uid())
  );

-- order_lines : lecture si commande visible
CREATE POLICY order_lines_buyer_select
  ON order_lines FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM orders o
      WHERE o.id = order_id AND o.buyer_user_id = auth.uid()
    )
  );

CREATE POLICY order_lines_owner_select
  ON order_lines FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM orders o
      JOIN entity e ON e.id = o.entity_id
      WHERE o.id = order_id AND e.user_id = auth.uid()
    )
  );
