-- ============================================================
-- Migration: event_activities
-- Sous-activités d'un event parent (festival → foot, basket…)
-- Billets et inscriptions rattachés à une activité.
-- ============================================================

CREATE TABLE event_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  entity_id uuid NOT NULL REFERENCES entity(id) ON DELETE CASCADE,
  title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 120),
  slug text NOT NULL CHECK (slug ~ '^[a-z0-9-]+$'),
  description text CHECK (description IS NULL OR char_length(description) <= 500),
  start_at timestamptz NOT NULL,
  end_at timestamptz CHECK (end_at IS NULL OR end_at > start_at),
  location_type event_location_type,
  location_details text CHECK (location_details IS NULL OR char_length(location_details) <= 300),
  capacity integer CHECK (capacity IS NULL OR capacity > 0),
  position integer NOT NULL DEFAULT 0,
  is_published boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT event_activities_slug_unique UNIQUE (event_id, slug)
);

COMMENT ON TABLE event_activities IS 'Activités / créneaux à l''intérieur d''un event parent (billetterie par activité).';

CREATE INDEX idx_event_activities_event ON event_activities (event_id, position);
CREATE INDEX idx_event_activities_start ON event_activities (event_id, start_at);

CREATE TRIGGER trg_event_activities_updated_at
  BEFORE UPDATE ON event_activities
  FOR EACH ROW EXECUTE FUNCTION trg_products_set_updated_at();

ALTER TABLE event_ticket_types
  ADD COLUMN activity_id uuid REFERENCES event_activities(id) ON DELETE CASCADE;

CREATE INDEX idx_event_ticket_types_activity ON event_ticket_types (activity_id, position)
  WHERE activity_id IS NOT NULL;

ALTER TABLE event_registrations
  ADD COLUMN activity_id uuid REFERENCES event_activities(id) ON DELETE SET NULL;

CREATE INDEX idx_event_registrations_activity ON event_registrations (activity_id, status)
  WHERE activity_id IS NOT NULL;

ALTER TABLE event_registrations
  DROP CONSTRAINT IF EXISTS event_registrations_unique_email;

CREATE UNIQUE INDEX event_registrations_unique_email_legacy
  ON event_registrations (event_id, lower(attendee_email))
  WHERE activity_id IS NULL;

CREATE UNIQUE INDEX event_registrations_unique_activity_email
  ON event_registrations (event_id, activity_id, lower(attendee_email))
  WHERE activity_id IS NOT NULL;

ALTER TABLE orders
  ADD COLUMN activity_id uuid REFERENCES event_activities(id) ON DELETE SET NULL;

-- =====================
-- RLS event_activities
-- =====================

ALTER TABLE event_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY event_activities_public_select
  ON event_activities FOR SELECT
  TO anon, authenticated
  USING (
    is_published = true
    AND EXISTS (
      SELECT 1 FROM events e
      WHERE e.id = event_id AND e.is_published = true
    )
  );

CREATE POLICY event_activities_owner_select
  ON event_activities FOR SELECT
  TO authenticated
  USING (
    entity_id IN (SELECT id FROM entity WHERE user_id = auth.uid())
  );

CREATE POLICY event_activities_owner_insert
  ON event_activities FOR INSERT
  TO authenticated
  WITH CHECK (
    entity_id IN (SELECT id FROM entity WHERE user_id = auth.uid())
  );

CREATE POLICY event_activities_owner_update
  ON event_activities FOR UPDATE
  TO authenticated
  USING (entity_id IN (SELECT id FROM entity WHERE user_id = auth.uid()))
  WITH CHECK (entity_id IN (SELECT id FROM entity WHERE user_id = auth.uid()));

CREATE POLICY event_activities_owner_delete
  ON event_activities FOR DELETE
  TO authenticated
  USING (entity_id IN (SELECT id FROM entity WHERE user_id = auth.uid()));

-- =====================
-- Holds par activité
-- =====================

CREATE OR REPLACE FUNCTION count_event_activity_holds(p_activity_id uuid)
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
      WHERE activity_id = p_activity_id AND status = 'confirmed'
    ), 0)
    + COALESCE((
      SELECT count(*)::integer
      FROM orders
      WHERE activity_id = p_activity_id
        AND order_kind = 'event_ticket'
        AND status = 'pending'
        AND (checkout_expires_at IS NULL OR checkout_expires_at > now())
    ), 0);
$$;

GRANT EXECUTE ON FUNCTION count_event_activity_holds(uuid) TO anon, authenticated;

CREATE OR REPLACE FUNCTION is_event_activity_past(p_activity event_activities)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT CASE
    WHEN p_activity.end_at IS NOT NULL THEN p_activity.end_at < now()
    ELSE p_activity.start_at < now()
  END;
$$;

-- =====================
-- Checkout avec activité
-- =====================

CREATE OR REPLACE FUNCTION create_event_ticket_checkout(
  p_entity_id uuid,
  p_event_id uuid,
  p_ticket_type_id uuid,
  p_attendee_name text,
  p_attendee_email text,
  p_attendee_phone text DEFAULT NULL,
  p_attendee_message text DEFAULT NULL,
  p_promo_code text DEFAULT NULL,
  p_form_answers jsonb DEFAULT '{}'::jsonb
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event events%ROWTYPE;
  v_type event_ticket_types%ROWTYPE;
  v_activity event_activities%ROWTYPE;
  v_price integer;
  v_discount integer := 0;
  v_total integer;
  v_promo_code_id uuid;
  v_order_id uuid;
  v_line_title text;
BEGIN
  SELECT * INTO v_event
  FROM events
  WHERE id = p_event_id
    AND entity_id = p_entity_id
    AND is_published = true;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'event_not_found' USING ERRCODE = 'P0001';
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

  IF v_type.activity_id IS NOT NULL THEN
    SELECT * INTO v_activity
    FROM event_activities
    WHERE id = v_type.activity_id
      AND event_id = p_event_id
      AND entity_id = p_entity_id
      AND is_published = true;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'activity_not_found' USING ERRCODE = 'P0001';
    END IF;

    IF is_event_activity_past(v_activity) THEN
      RAISE EXCEPTION 'activity_past' USING ERRCODE = 'P0001';
    END IF;

    IF v_activity.capacity IS NOT NULL
      AND count_event_activity_holds(v_activity.id) >= v_activity.capacity THEN
      RAISE EXCEPTION 'activity_full' USING ERRCODE = 'P0001';
    END IF;

    v_line_title := v_type.title || ' — ' || v_activity.title || ' — ' || v_event.title;
  ELSE
    IF v_event.start_at <= now() THEN
      RAISE EXCEPTION 'event_past' USING ERRCODE = 'P0001';
    END IF;

    IF v_event.capacity IS NOT NULL AND count_event_ticket_holds(p_event_id) >= v_event.capacity THEN
      RAISE EXCEPTION 'event_full' USING ERRCODE = 'P0001';
    END IF;

    v_line_title := v_type.title || ' — ' || v_event.title;
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

  SELECT code_id, discount_cents
  INTO v_promo_code_id, v_discount
  FROM resolve_event_promo_discount(p_entity_id, p_event_id, p_promo_code, v_price);

  v_total := greatest(0, v_price - coalesce(v_discount, 0));

  INSERT INTO orders (
    entity_id,
    order_number,
    buyer_name,
    buyer_email,
    status,
    fulfillment_status,
    subtotal_cents,
    discount_cents,
    total_cents,
    currency,
    order_kind,
    event_id,
    activity_id,
    event_ticket_type_id,
    attendee_phone,
    attendee_message,
    checkout_expires_at,
    discount_code_id,
    form_answers
  ) VALUES (
    p_entity_id,
    generate_order_number(),
    trim(p_attendee_name),
    trim(p_attendee_email),
    'pending',
    'not_applicable',
    v_price,
    coalesce(v_discount, 0),
    v_total,
    COALESCE(v_type.currency, 'EUR'),
    'event_ticket',
    p_event_id,
    v_type.activity_id,
    p_ticket_type_id,
    NULLIF(trim(p_attendee_phone), ''),
    NULLIF(trim(p_attendee_message), ''),
    now() + interval '15 minutes',
    v_promo_code_id,
    coalesce(p_form_answers, '{}'::jsonb)
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
    v_total,
    v_total,
    v_line_title
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
  v_activity event_activities%ROWTYPE;
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

  SELECT * INTO v_type FROM event_ticket_types WHERE id = v_order.event_ticket_type_id;
  SELECT * INTO v_event FROM events WHERE id = v_order.event_id;

  IF v_type.activity_id IS NOT NULL THEN
    SELECT * INTO v_activity FROM event_activities WHERE id = v_type.activity_id;

    IF v_activity.capacity IS NOT NULL
      AND count_event_activity_holds(v_activity.id) >= v_activity.capacity THEN
      RAISE EXCEPTION 'activity_full' USING ERRCODE = 'P0001';
    END IF;
  ELSIF v_event.capacity IS NOT NULL AND count_event_ticket_holds(v_order.event_id) >= v_event.capacity THEN
    RAISE EXCEPTION 'event_full' USING ERRCODE = 'P0001';
  END IF;

  v_ticket_code := generate_event_ticket_code();

  INSERT INTO event_registrations (
    event_id,
    entity_id,
    activity_id,
    attendee_name,
    attendee_email,
    attendee_phone,
    message,
    status,
    ticket_type_id,
    ticket_code,
    order_id,
    price_cents,
    form_answers
  ) VALUES (
    v_order.event_id,
    v_order.entity_id,
    v_type.activity_id,
    v_order.buyer_name,
    v_order.buyer_email,
    v_order.attendee_phone,
    v_order.attendee_message,
    'confirmed',
    v_order.event_ticket_type_id,
    v_ticket_code,
    v_order.id,
    v_order.total_cents,
    coalesce(v_order.form_answers, '{}'::jsonb)
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
