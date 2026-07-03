-- Phase 4 Service : paiement à la résa, politique d'annulation, analytics revenus

-- =====================
-- 1. Enums
-- =====================

CREATE TYPE booking_payment_status AS ENUM (
  'unpaid',
  'pending',
  'paid',
  'refunded',
  'partially_refunded'
);

ALTER TYPE analytics_event_type ADD VALUE IF NOT EXISTS 'booking_checkout_started';
ALTER TYPE analytics_event_type ADD VALUE IF NOT EXISTS 'booking_checkout_completed';

-- =====================
-- 2. appointment_types — paiement & annulation
-- =====================

ALTER TABLE appointment_types
  ADD COLUMN IF NOT EXISTS payment_required boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS deposit_percent integer NOT NULL DEFAULT 100
    CHECK (deposit_percent >= 1 AND deposit_percent <= 100),
  ADD COLUMN IF NOT EXISTS cancel_min_hours integer NOT NULL DEFAULT 24
    CHECK (cancel_min_hours >= 0 AND cancel_min_hours <= 720);

COMMENT ON COLUMN appointment_types.payment_required IS
  'Si true et prix > 0, le client paie en ligne avant confirmation.';
COMMENT ON COLUMN appointment_types.deposit_percent IS
  'Pourcentage du prix (promo ou catalogue) exigé à la réservation (1–100).';
COMMENT ON COLUMN appointment_types.cancel_min_hours IS
  'Délai minimum avant le créneau pour annuler (heures). 0 = jusqu''au début.';

-- =====================
-- 3. bookings — paiement & attribution
-- =====================

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS price_cents integer CHECK (price_cents IS NULL OR price_cents >= 0),
  ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'EUR',
  ADD COLUMN IF NOT EXISTS payment_status booking_payment_status NOT NULL DEFAULT 'unpaid',
  ADD COLUMN IF NOT EXISTS stripe_checkout_session_id text UNIQUE,
  ADD COLUMN IF NOT EXISTS stripe_payment_intent_id text,
  ADD COLUMN IF NOT EXISTS paid_at timestamptz,
  ADD COLUMN IF NOT EXISTS refund_cents integer NOT NULL DEFAULT 0 CHECK (refund_cents >= 0),
  ADD COLUMN IF NOT EXISTS checkout_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'web';

COMMENT ON COLUMN bookings.source IS 'Canal de réservation (web, api, …).';

CREATE INDEX IF NOT EXISTS idx_bookings_payment_pending
  ON bookings (checkout_expires_at)
  WHERE payment_status = 'pending' AND status = 'pending';

CREATE INDEX IF NOT EXISTS idx_bookings_paid_at
  ON bookings (entity_id, paid_at DESC NULLS LAST)
  WHERE payment_status = 'paid';

-- =====================
-- 4. Helpers prix service
-- =====================

CREATE OR REPLACE FUNCTION resolve_appointment_unit_price_cents(p_type appointment_types)
RETURNS integer
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(p_type.promo_price_cents, p_type.price_cents, 0);
$$;

CREATE OR REPLACE FUNCTION resolve_appointment_charge_cents(p_type appointment_types)
RETURNS integer
LANGUAGE sql
STABLE
AS $$
  SELECT CASE
    WHEN NOT p_type.payment_required THEN 0
    WHEN resolve_appointment_unit_price_cents(p_type) <= 0 THEN 0
    ELSE GREATEST(
      1,
      (resolve_appointment_unit_price_cents(p_type) * p_type.deposit_percent) / 100
    )
  END;
$$;

CREATE OR REPLACE FUNCTION booking_blocks_slot(p_booking bookings)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT
    p_booking.status IN ('pending', 'confirmed')
    AND NOT (
      p_booking.status = 'pending'
      AND p_booking.payment_status = 'pending'
      AND p_booking.checkout_expires_at IS NOT NULL
      AND p_booking.checkout_expires_at < now()
    );
$$;

-- =====================
-- 5. RPC checkout booking
-- =====================

CREATE OR REPLACE FUNCTION create_booking_checkout(
  p_entity_id uuid,
  p_appointment_type_id uuid,
  p_booker_name text,
  p_booker_email text,
  p_start_at timestamptz,
  p_end_at timestamptz,
  p_booker_phone text DEFAULT NULL,
  p_booker_message text DEFAULT NULL,
  p_source text DEFAULT 'web'
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_type appointment_types%ROWTYPE;
  v_charge integer;
  v_booking_id uuid;
  v_auto_accept boolean;
  v_status booking_status;
BEGIN
  IF p_start_at >= p_end_at THEN
    RAISE EXCEPTION 'invalid_slot' USING ERRCODE = 'P0001';
  END IF;

  SELECT * INTO v_type
  FROM appointment_types
  WHERE id = p_appointment_type_id
    AND entity_id = p_entity_id
    AND is_active = true;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'service_not_found' USING ERRCODE = 'P0001';
  END IF;

  v_charge := resolve_appointment_charge_cents(v_type);
  IF v_charge <= 0 THEN
    RAISE EXCEPTION 'payment_not_required' USING ERRCODE = 'P0001';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM bookings b
    WHERE b.entity_id = p_entity_id
      AND booking_blocks_slot(b)
      AND b.start_at < p_end_at
      AND b.end_at > p_start_at
  ) THEN
    RAISE EXCEPTION 'slot_unavailable' USING ERRCODE = 'P0001';
  END IF;

  v_auto_accept := v_type.auto_accept_bookings;
  v_status := 'pending';

  INSERT INTO bookings (
    entity_id,
    appointment_type_id,
    booker_name,
    booker_email,
    booker_phone,
    booker_message,
    start_at,
    end_at,
    status,
    price_cents,
    currency,
    payment_status,
    checkout_expires_at,
    source
  ) VALUES (
    p_entity_id,
    p_appointment_type_id,
    trim(p_booker_name),
    trim(p_booker_email),
    NULLIF(trim(p_booker_phone), ''),
    NULLIF(trim(p_booker_message), ''),
    p_start_at,
    p_end_at,
    v_status,
    v_charge,
    COALESCE(v_type.currency, 'EUR'),
    'pending',
    now() + interval '15 minutes',
    COALESCE(NULLIF(trim(p_source), ''), 'web')
  )
  RETURNING id INTO v_booking_id;

  RETURN v_booking_id;
END;
$$;

COMMENT ON FUNCTION create_booking_checkout IS
  'Crée un RDV pending + paiement pending avant redirection Stripe.';

CREATE OR REPLACE FUNCTION attach_stripe_session_to_booking(
  p_booking_id uuid,
  p_stripe_session_id text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE bookings
  SET stripe_checkout_session_id = p_stripe_session_id
  WHERE id = p_booking_id
    AND payment_status = 'pending'
    AND status = 'pending';
END;
$$;

CREATE OR REPLACE FUNCTION complete_booking_checkout(
  p_stripe_session_id text,
  p_payment_intent_id text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booking bookings%ROWTYPE;
  v_type appointment_types%ROWTYPE;
  v_new_status booking_status;
BEGIN
  SELECT * INTO v_booking
  FROM bookings
  WHERE stripe_checkout_session_id = p_stripe_session_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'booking_not_found' USING ERRCODE = 'P0001';
  END IF;

  IF v_booking.payment_status = 'paid' THEN
    RETURN v_booking.id;
  END IF;

  IF v_booking.payment_status <> 'pending' THEN
    RAISE EXCEPTION 'booking_not_pending_payment' USING ERRCODE = 'P0001';
  END IF;

  IF v_booking.checkout_expires_at IS NOT NULL AND v_booking.checkout_expires_at < now() THEN
    RAISE EXCEPTION 'checkout_expired' USING ERRCODE = 'P0001';
  END IF;

  SELECT * INTO v_type FROM appointment_types WHERE id = v_booking.appointment_type_id;

  v_new_status := CASE
    WHEN COALESCE(v_type.auto_accept_bookings, true) THEN 'confirmed'::booking_status
    ELSE 'pending'::booking_status
  END;

  UPDATE bookings
  SET
    payment_status = 'paid',
    status = v_new_status,
    stripe_payment_intent_id = COALESCE(p_payment_intent_id, stripe_payment_intent_id),
    paid_at = now(),
    checkout_expires_at = NULL
  WHERE id = v_booking.id;

  RETURN v_booking.id;
END;
$$;

COMMENT ON FUNCTION complete_booking_checkout IS
  'Finalise le paiement d''un RDV (webhook Stripe).';

CREATE OR REPLACE FUNCTION expire_stale_booking_checkouts()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  UPDATE bookings
  SET
    status = 'cancelled',
    payment_status = 'pending',
    cancelled_at = now(),
    cancelled_by = 'owner'
  WHERE status = 'pending'
    AND payment_status = 'pending'
    AND checkout_expires_at IS NOT NULL
    AND checkout_expires_at < now();

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION create_booking_checkout(uuid, uuid, text, text, timestamptz, timestamptz, text, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION attach_stripe_session_to_booking(uuid, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION complete_booking_checkout(text, text) TO service_role;
GRANT EXECUTE ON FUNCTION expire_stale_booking_checkouts() TO service_role;

-- =====================
-- 6. Analytics service — revenus
-- =====================

CREATE OR REPLACE FUNCTION get_analyse_service_data(
  p_entity_id uuid,
  p_from timestamptz,
  p_to timestamptz,
  p_prev_from timestamptz,
  p_prev_to timestamptz,
  p_period text
)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'views_cur',
      count_analytics_distinct_visitors(
        p_entity_id, ARRAY['service_view']::analytics_event_type[], p_from, p_to, NULL, NULL
      ),
    'views_prev',
      count_analytics_distinct_visitors(
        p_entity_id, ARRAY['service_view']::analytics_event_type[], p_prev_from, p_prev_to, NULL, NULL
      ),
    'bookings_cur',
      COALESCE(
        (SELECT jsonb_agg(
          jsonb_build_object(
            'id', b.id,
            'created_at', b.created_at,
            'status', b.status,
            'appointment_type_id', b.appointment_type_id,
            'appointment_type_title', at.title,
            'price_cents', b.price_cents,
            'payment_status', b.payment_status,
            'paid_at', b.paid_at
          )
          ORDER BY b.created_at
        )
        FROM bookings b
        LEFT JOIN appointment_types at ON at.id = b.appointment_type_id
        WHERE b.entity_id = p_entity_id
          AND b.created_at >= p_from AND b.created_at <= p_to),
        '[]'::jsonb
      ),
    'bookings_prev',
      COALESCE(
        (SELECT jsonb_agg(
          jsonb_build_object(
            'status', b.status,
            'price_cents', b.price_cents,
            'payment_status', b.payment_status,
            'paid_at', b.paid_at
          )
        )
        FROM bookings b
        WHERE b.entity_id = p_entity_id
          AND b.created_at >= p_prev_from AND b.created_at <= p_prev_to),
        '[]'::jsonb
      ),
    'revenue_cur',
      COALESCE((
        SELECT SUM(b.price_cents)
        FROM bookings b
        WHERE b.entity_id = p_entity_id
          AND b.payment_status = 'paid'
          AND b.paid_at >= p_from AND b.paid_at <= p_to
      ), 0),
    'revenue_prev',
      COALESCE((
        SELECT SUM(b.price_cents)
        FROM bookings b
        WHERE b.entity_id = p_entity_id
          AND b.payment_status = 'paid'
          AND b.paid_at >= p_prev_from AND b.paid_at <= p_prev_to
      ), 0)
  );
$$;
