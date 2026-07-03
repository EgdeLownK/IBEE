-- Phase 3 Billetterie : formulaires, promos event, annulation, rappels

-- =====================
-- 1. Colonnes events / inscriptions / commandes
-- =====================

ALTER TABLE events
  ADD COLUMN IF NOT EXISTS cancel_min_hours integer NOT NULL DEFAULT 24
    CHECK (cancel_min_hours >= 0 AND cancel_min_hours <= 720),
  ADD COLUMN IF NOT EXISTS registration_fields jsonb NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN events.cancel_min_hours IS
  'Délai minimum avant le début pour annuler une inscription payante (heures).';
COMMENT ON COLUMN events.registration_fields IS
  'Champs custom du formulaire d''inscription [{id,label,type,required,placeholder?,options?}].';

ALTER TABLE event_registrations
  ADD COLUMN IF NOT EXISTS form_answers jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS reminder_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS refund_cents integer NOT NULL DEFAULT 0
    CHECK (refund_cents >= 0);

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS discount_code_id uuid REFERENCES discount_codes(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS form_answers jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_event_registrations_reminder
  ON event_registrations (event_id, reminder_sent_at)
  WHERE status = 'confirmed' AND reminder_sent_at IS NULL;

-- =====================
-- 2. Codes promo scope événement
-- =====================

ALTER TYPE discount_applies_to ADD VALUE IF NOT EXISTS 'all_events';
ALTER TYPE discount_applies_to ADD VALUE IF NOT EXISTS 'specific_events';

CREATE TABLE IF NOT EXISTS discount_code_events (
  code_id uuid NOT NULL REFERENCES discount_codes(id) ON DELETE CASCADE,
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  PRIMARY KEY (code_id, event_id)
);

CREATE INDEX IF NOT EXISTS idx_discount_code_events_event ON discount_code_events (event_id);

ALTER TABLE discount_code_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "discount_code_events_owner_all"
  ON discount_code_events FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM discount_codes dc
      JOIN entity e ON e.id = dc.entity_id
      WHERE dc.id = code_id AND e.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM discount_codes dc
      JOIN entity e ON e.id = dc.entity_id
      WHERE dc.id = code_id AND e.user_id = auth.uid()
    )
  );

-- =====================
-- 3. Promo événement
-- =====================

CREATE OR REPLACE FUNCTION resolve_event_promo_discount(
  p_entity_id uuid,
  p_event_id uuid,
  p_code text,
  p_subtotal_cents integer
)
RETURNS TABLE (code_id uuid, discount_cents integer)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code discount_codes%ROWTYPE;
  v_discount integer;
  v_uses integer;
BEGIN
  IF p_code IS NULL OR trim(p_code) = '' OR p_subtotal_cents <= 0 THEN
    RETURN;
  END IF;

  SELECT * INTO v_code
  FROM discount_codes
  WHERE entity_id = p_entity_id
    AND upper(code) = upper(trim(p_code))
    AND is_active = true;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'promo_invalid' USING ERRCODE = 'P0001';
  END IF;

  IF v_code.starts_at IS NOT NULL AND v_code.starts_at > now() THEN
    RAISE EXCEPTION 'promo_not_started' USING ERRCODE = 'P0001';
  END IF;

  IF v_code.ends_at IS NOT NULL AND v_code.ends_at < now() THEN
    RAISE EXCEPTION 'promo_expired' USING ERRCODE = 'P0001';
  END IF;

  IF v_code.applies_to = 'specific_events' THEN
    IF NOT EXISTS (
      SELECT 1 FROM discount_code_events dce
      WHERE dce.code_id = v_code.id AND dce.event_id = p_event_id
    ) THEN
      RAISE EXCEPTION 'promo_not_applicable' USING ERRCODE = 'P0001';
    END IF;
  ELSIF v_code.applies_to NOT IN ('all_events', 'specific_events') THEN
    RAISE EXCEPTION 'promo_not_applicable' USING ERRCODE = 'P0001';
  END IF;

  IF v_code.min_purchase_cents IS NOT NULL AND p_subtotal_cents < v_code.min_purchase_cents THEN
    RAISE EXCEPTION 'promo_min_purchase' USING ERRCODE = 'P0001';
  END IF;

  IF v_code.max_uses_total IS NOT NULL THEN
    SELECT count(*)::integer INTO v_uses
    FROM orders
    WHERE discount_code_id = v_code.id AND status = 'paid';

    IF v_uses >= v_code.max_uses_total THEN
      RAISE EXCEPTION 'promo_max_uses' USING ERRCODE = 'P0001';
    END IF;
  END IF;

  IF v_code.type = 'percentage' THEN
    v_discount := floor(p_subtotal_cents * v_code.value / 100)::integer;
  ELSIF v_code.type = 'fixed_amount' THEN
    v_discount := least(p_subtotal_cents, (v_code.value * 100)::integer);
  ELSE
    RAISE EXCEPTION 'promo_not_applicable' USING ERRCODE = 'P0001';
  END IF;

  v_discount := greatest(0, least(p_subtotal_cents, v_discount));
  IF v_discount <= 0 THEN
    RETURN;
  END IF;

  code_id := v_code.id;
  discount_cents := v_discount;
  RETURN NEXT;
END;
$$;

GRANT EXECUTE ON FUNCTION resolve_event_promo_discount(uuid, uuid, text, integer) TO anon, authenticated;

-- =====================
-- 4. Checkout avec promo + formulaire
-- =====================

DROP FUNCTION IF EXISTS create_event_ticket_checkout(uuid, uuid, uuid, text, text, text, text);

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
  v_price integer;
  v_discount integer := 0;
  v_total integer;
  v_promo_code_id uuid;
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

  IF p_promo_code IS NOT NULL AND trim(p_promo_code) <> '' THEN
    SELECT r.code_id, r.discount_cents
    INTO v_promo_code_id, v_discount
    FROM resolve_event_promo_discount(p_entity_id, p_event_id, p_promo_code, v_price) r;
  END IF;

  v_total := greatest(0, v_price - coalesce(v_discount, 0));
  IF v_total <= 0 THEN
    RAISE EXCEPTION 'payment_not_required' USING ERRCODE = 'P0001';
  END IF;

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
    price_cents,
    form_answers
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

GRANT EXECUTE ON FUNCTION create_event_ticket_checkout(uuid, uuid, uuid, text, text, text, text, text, jsonb) TO anon, authenticated;

-- =====================
-- 5. Rappels J-1
-- =====================

CREATE OR REPLACE FUNCTION list_event_registrations_due_for_reminder()
RETURNS SETOF event_registrations
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT r.*
  FROM event_registrations r
  JOIN events e ON e.id = r.event_id
  WHERE r.status = 'confirmed'
    AND r.reminder_sent_at IS NULL
    AND e.start_at > now()
    AND e.start_at <= now() + interval '25 hours'
    AND e.start_at >= now() + interval '23 hours';
$$;

GRANT EXECUTE ON FUNCTION list_event_registrations_due_for_reminder() TO service_role;
