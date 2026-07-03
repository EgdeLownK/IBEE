-- Phase 2 Billetterie : types de billets, commandes événement, billet numérique

-- =====================
-- 1. Enums & tables
-- =====================

CREATE TYPE order_kind AS ENUM ('product', 'event_ticket');
CREATE TYPE order_line_kind AS ENUM ('product', 'event_ticket');

CREATE TABLE event_ticket_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  entity_id uuid NOT NULL REFERENCES entity(id) ON DELETE CASCADE,
  title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 120),
  slug text NOT NULL CHECK (slug ~ '^[a-z0-9-]+$'),
  price_cents integer NOT NULL DEFAULT 0 CHECK (price_cents >= 0),
  currency text NOT NULL DEFAULT 'EUR',
  sales_start_at timestamptz,
  sales_end_at timestamptz,
  quota integer CHECK (quota IS NULL OR quota > 0),
  position integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT event_ticket_types_slug_unique UNIQUE (event_id, slug)
);

COMMENT ON TABLE event_ticket_types IS 'Types de billets par événement (standard, early-bird, gratuit…).';

CREATE INDEX idx_event_ticket_types_event ON event_ticket_types (event_id, position);

CREATE TRIGGER trg_event_ticket_types_updated_at
  BEFORE UPDATE ON event_ticket_types
  FOR EACH ROW EXECUTE FUNCTION trg_products_set_updated_at();

ALTER TABLE event_registrations
  ADD COLUMN IF NOT EXISTS ticket_type_id uuid REFERENCES event_ticket_types(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS ticket_code text,
  ADD COLUMN IF NOT EXISTS order_id uuid REFERENCES orders(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS price_cents integer CHECK (price_cents IS NULL OR price_cents >= 0);

CREATE UNIQUE INDEX IF NOT EXISTS idx_event_registrations_ticket_code
  ON event_registrations (ticket_code)
  WHERE ticket_code IS NOT NULL;

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS order_kind order_kind NOT NULL DEFAULT 'product',
  ADD COLUMN IF NOT EXISTS event_id uuid REFERENCES events(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS event_ticket_type_id uuid REFERENCES event_ticket_types(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS attendee_phone text,
  ADD COLUMN IF NOT EXISTS attendee_message text,
  ADD COLUMN IF NOT EXISTS checkout_expires_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_orders_event_pending
  ON orders (event_id, checkout_expires_at)
  WHERE order_kind = 'event_ticket' AND status = 'pending';

ALTER TABLE order_lines
  ADD COLUMN IF NOT EXISTS line_kind order_line_kind NOT NULL DEFAULT 'product',
  ADD COLUMN IF NOT EXISTS event_id uuid REFERENCES events(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS event_ticket_type_id uuid REFERENCES event_ticket_types(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS registration_id uuid REFERENCES event_registrations(id) ON DELETE SET NULL;

ALTER TABLE order_lines
  ALTER COLUMN product_id DROP NOT NULL;

ALTER TABLE order_lines
  ALTER COLUMN product_type DROP NOT NULL;

ALTER TYPE analytics_event_type ADD VALUE IF NOT EXISTS 'event_checkout_started';
ALTER TYPE analytics_event_type ADD VALUE IF NOT EXISTS 'event_checkout_completed';

-- Billets par défaut pour events déjà payants
INSERT INTO event_ticket_types (event_id, entity_id, title, slug, price_cents, currency, position)
SELECT e.id, e.entity_id, 'Standard', 'standard', e.price_cents, e.currency, 0
FROM events e
WHERE e.price_cents IS NOT NULL
  AND e.price_cents > 0
  AND NOT EXISTS (
    SELECT 1 FROM event_ticket_types t WHERE t.event_id = e.id
  );

-- =====================
-- 2. Helpers
-- =====================

CREATE OR REPLACE FUNCTION generate_event_ticket_code() RETURNS text
LANGUAGE sql
AS $$
  SELECT 'EVT-' || upper(substring(replace(gen_random_uuid()::text, '-', '') FROM 1 FOR 10));
$$;

CREATE OR REPLACE FUNCTION resolve_event_ticket_price_cents(p_type event_ticket_types)
RETURNS integer
LANGUAGE sql
STABLE
AS $$
  SELECT CASE
    WHEN NOT p_type.is_active THEN 0
    WHEN p_type.sales_start_at IS NOT NULL AND p_type.sales_start_at > now() THEN 0
    WHEN p_type.sales_end_at IS NOT NULL AND p_type.sales_end_at < now() THEN 0
    ELSE p_type.price_cents
  END;
$$;

CREATE OR REPLACE FUNCTION count_event_ticket_holds(p_event_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    COALESCE((
      SELECT count(*)::integer
      FROM event_registrations
      WHERE event_id = p_event_id AND status = 'confirmed'
    ), 0)
    + COALESCE((
      SELECT count(*)::integer
      FROM orders
      WHERE event_id = p_event_id
        AND order_kind = 'event_ticket'
        AND status = 'pending'
        AND (checkout_expires_at IS NULL OR checkout_expires_at > now())
    ), 0);
$$;

-- =====================
-- 3. RPC checkout événement
-- =====================

CREATE OR REPLACE FUNCTION create_event_ticket_checkout(
  p_entity_id uuid,
  p_event_id uuid,
  p_ticket_type_id uuid,
  p_attendee_name text,
  p_attendee_email text,
  p_attendee_phone text DEFAULT NULL,
  p_attendee_message text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event events%ROWTYPE;
  v_type event_ticket_types%ROWTYPE;
  v_price integer;
  v_order_id uuid;
BEGIN
  SELECT * INTO v_event
  FROM events
  WHERE id = p_event_id
    AND entity_id = p_entity_id
    AND is_published = true;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'event_not_found' USING ERRCODE = 'P0001';
  END IF;

  IF v_event.start_at <= now() THEN
    RAISE EXCEPTION 'event_past' USING ERRCODE = 'P0001';
  END IF;

  SELECT * INTO v_type
  FROM event_ticket_types
  WHERE id = p_ticket_type_id
    AND event_id = p_event_id
    AND entity_id = p_entity_id
    AND is_active = true;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'ticket_type_not_found' USING ERRCODE = 'P0001';
  END IF;

  v_price := resolve_event_ticket_price_cents(v_type);
  IF v_price <= 0 THEN
    RAISE EXCEPTION 'payment_not_required' USING ERRCODE = 'P0001';
  END IF;

  IF v_event.capacity IS NOT NULL AND count_event_ticket_holds(p_event_id) >= v_event.capacity THEN
    RAISE EXCEPTION 'event_full' USING ERRCODE = 'P0001';
  END IF;

  IF v_type.quota IS NOT NULL THEN
    IF (
      SELECT count(*)::integer
      FROM event_registrations r
      WHERE r.ticket_type_id = p_ticket_type_id AND r.status = 'confirmed'
    ) + (
      SELECT count(*)::integer
      FROM orders o
      WHERE o.event_ticket_type_id = p_ticket_type_id
        AND o.status = 'pending'
        AND (o.checkout_expires_at IS NULL OR o.checkout_expires_at > now())
    ) >= v_type.quota THEN
      RAISE EXCEPTION 'ticket_quota_reached' USING ERRCODE = 'P0001';
    END IF;
  END IF;

  INSERT INTO orders (
    entity_id,
    order_number,
    buyer_name,
    buyer_email,
    status,
    fulfillment_status,
    subtotal_cents,
    total_cents,
    currency,
    order_kind,
    event_id,
    event_ticket_type_id,
    attendee_phone,
    attendee_message,
    checkout_expires_at
  ) VALUES (
    p_entity_id,
    generate_order_number(),
    trim(p_attendee_name),
    trim(p_attendee_email),
    'pending',
    'not_applicable',
    v_price,
    v_price,
    COALESCE(v_type.currency, 'EUR'),
    'event_ticket',
    p_event_id,
    p_ticket_type_id,
    NULLIF(trim(p_attendee_phone), ''),
    NULLIF(trim(p_attendee_message), ''),
    now() + interval '15 minutes'
  )
  RETURNING id INTO v_order_id;

  INSERT INTO order_lines (
    order_id,
    line_kind,
    event_id,
    event_ticket_type_id,
    quantity,
    unit_price_cents,
    line_total_cents,
    title_snapshot
  ) VALUES (
    v_order_id,
    'event_ticket',
    p_event_id,
    p_ticket_type_id,
    1,
    v_price,
    v_price,
    v_type.title || ' — ' || v_event.title
  );

  RETURN v_order_id;
END;
$$;

CREATE OR REPLACE FUNCTION complete_event_ticket_checkout(
  p_stripe_session_id text,
  p_payment_intent_id text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order orders%ROWTYPE;
  v_event events%ROWTYPE;
  v_type event_ticket_types%ROWTYPE;
  v_registration_id uuid;
  v_ticket_code text;
BEGIN
  SELECT * INTO v_order
  FROM orders
  WHERE stripe_checkout_session_id = p_stripe_session_id
    AND order_kind = 'event_ticket'
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

  IF v_order.checkout_expires_at IS NOT NULL AND v_order.checkout_expires_at < now() THEN
    RAISE EXCEPTION 'checkout_expired' USING ERRCODE = 'P0001';
  END IF;

  SELECT * INTO v_event FROM events WHERE id = v_order.event_id;
  SELECT * INTO v_type FROM event_ticket_types WHERE id = v_order.event_ticket_type_id;

  IF v_event.capacity IS NOT NULL AND count_event_ticket_holds(v_order.event_id) >= v_event.capacity THEN
    RAISE EXCEPTION 'event_full' USING ERRCODE = 'P0001';
  END IF;

  v_ticket_code := generate_event_ticket_code();

  INSERT INTO event_registrations (
    event_id,
    entity_id,
    attendee_name,
    attendee_email,
    attendee_phone,
    message,
    status,
    ticket_type_id,
    ticket_code,
    order_id,
    price_cents
  ) VALUES (
    v_order.event_id,
    v_order.entity_id,
    v_order.buyer_name,
    v_order.buyer_email,
    v_order.attendee_phone,
    v_order.attendee_message,
    'confirmed',
    v_order.event_ticket_type_id,
    v_ticket_code,
    v_order.id,
    v_order.total_cents
  )
  RETURNING id INTO v_registration_id;

  UPDATE orders
  SET
    status = 'paid',
    stripe_payment_intent_id = COALESCE(p_payment_intent_id, stripe_payment_intent_id),
    paid_at = now(),
    checkout_expires_at = NULL,
    fulfillment_status = 'delivered'
  WHERE id = v_order.id;

  UPDATE order_lines
  SET registration_id = v_registration_id
  WHERE order_id = v_order.id;

  RETURN v_order.id;
END;
$$;

CREATE OR REPLACE FUNCTION expire_stale_event_ticket_checkouts()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  UPDATE orders
  SET status = 'cancelled', cancelled_at = now()
  WHERE order_kind = 'event_ticket'
    AND status = 'pending'
    AND checkout_expires_at IS NOT NULL
    AND checkout_expires_at < now();

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION create_event_ticket_checkout(uuid, uuid, uuid, text, text, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION complete_event_ticket_checkout(text, text) TO service_role;
GRANT EXECUTE ON FUNCTION expire_stale_event_ticket_checkouts() TO service_role;
GRANT EXECUTE ON FUNCTION count_event_ticket_holds(uuid) TO anon, authenticated;

-- =====================
-- 4. RLS event_ticket_types
-- =====================

ALTER TABLE event_ticket_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "event_ticket_types_public_select"
  ON event_ticket_types FOR SELECT
  TO anon, authenticated
  USING (
    is_active = true
    AND EXISTS (
      SELECT 1 FROM events e
      WHERE e.id = event_id AND e.is_published = true
    )
  );

CREATE POLICY "event_ticket_types_owner_all"
  ON event_ticket_types FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM entity WHERE id = entity_id AND user_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM entity WHERE id = entity_id AND user_id = auth.uid())
  );
