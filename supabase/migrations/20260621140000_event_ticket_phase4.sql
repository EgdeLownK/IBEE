-- Phase 4 Billetterie : check-in jour J, stats live, analytics revenus event

ALTER TABLE event_registrations
  ADD COLUMN IF NOT EXISTS checked_in_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_event_registrations_checkin
  ON event_registrations (event_id, checked_in_at)
  WHERE status = 'confirmed';

COMMENT ON COLUMN event_registrations.checked_in_at IS 'Horodatage scan entrée jour J (owner).';

-- =====================
-- Check-in billet (owner)
-- =====================

CREATE OR REPLACE FUNCTION check_in_event_registration(
  p_entity_id uuid,
  p_ticket_code text,
  p_event_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_reg event_registrations%ROWTYPE;
  v_event events%ROWTYPE;
  v_type_title text;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM entity WHERE id = p_entity_id AND user_id = auth.uid()) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_reg
  FROM event_registrations
  WHERE entity_id = p_entity_id
    AND upper(trim(ticket_code)) = upper(trim(p_ticket_code))
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('status', 'invalid');
  END IF;

  IF p_event_id IS NOT NULL AND v_reg.event_id <> p_event_id THEN
    SELECT title INTO v_event FROM events WHERE id = v_reg.event_id;
    RETURN jsonb_build_object(
      'status', 'wrong_event',
      'registration_id', v_reg.id,
      'event_title', v_event.title
    );
  END IF;

  IF v_reg.status = 'cancelled' THEN
    RETURN jsonb_build_object('status', 'cancelled', 'registration_id', v_reg.id);
  END IF;

  SELECT title INTO v_event FROM events WHERE id = v_reg.event_id;
  SELECT title INTO v_type_title FROM event_ticket_types WHERE id = v_reg.ticket_type_id;

  IF v_reg.checked_in_at IS NOT NULL THEN
    RETURN jsonb_build_object(
      'status', 'already_checked_in',
      'registration_id', v_reg.id,
      'checked_in_at', v_reg.checked_in_at,
      'attendee_name', v_reg.attendee_name,
      'event_title', v_event.title,
      'ticket_type_title', v_type_title
    );
  END IF;

  UPDATE event_registrations
  SET checked_in_at = now()
  WHERE id = v_reg.id
  RETURNING checked_in_at INTO v_reg.checked_in_at;

  RETURN jsonb_build_object(
    'status', 'checked_in',
    'registration_id', v_reg.id,
    'checked_in_at', v_reg.checked_in_at,
    'attendee_name', v_reg.attendee_name,
    'attendee_email', v_reg.attendee_email,
    'event_title', v_event.title,
    'ticket_type_title', v_type_title
  );
END;
$$;

GRANT EXECUTE ON FUNCTION check_in_event_registration(uuid, text, uuid) TO authenticated;

-- =====================
-- Stats live jour J
-- =====================

CREATE OR REPLACE FUNCTION get_event_checkin_live_stats(
  p_entity_id uuid,
  p_event_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_confirmed bigint;
  v_checked_in bigint;
  v_revenue_cents bigint;
  v_sales_today bigint;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM entity WHERE id = p_entity_id AND user_id = auth.uid()) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  SELECT count(*)::bigint INTO v_confirmed
  FROM event_registrations
  WHERE entity_id = p_entity_id
    AND event_id = p_event_id
    AND status = 'confirmed';

  SELECT count(*)::bigint INTO v_checked_in
  FROM event_registrations
  WHERE entity_id = p_entity_id
    AND event_id = p_event_id
    AND status = 'confirmed'
    AND checked_in_at IS NOT NULL;

  SELECT COALESCE(SUM(o.total_cents), 0)::bigint INTO v_revenue_cents
  FROM orders o
  WHERE o.entity_id = p_entity_id
    AND o.event_id = p_event_id
    AND o.order_kind = 'event_ticket'
    AND o.status = 'paid';

  SELECT count(*)::bigint INTO v_sales_today
  FROM event_registrations
  WHERE entity_id = p_entity_id
    AND event_id = p_event_id
    AND status = 'confirmed'
    AND created_at >= date_trunc('day', now());

  RETURN jsonb_build_object(
    'confirmed_count', v_confirmed,
    'checked_in_count', v_checked_in,
    'revenue_cents', v_revenue_cents,
    'sales_today', v_sales_today
  );
END;
$$;

GRANT EXECUTE ON FUNCTION get_event_checkin_live_stats(uuid, uuid) TO authenticated;

-- =====================
-- Analytics event — revenus billetterie
-- =====================

CREATE OR REPLACE FUNCTION get_analyse_event_data(
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
    'registrations_cur',
      COALESCE(
        (SELECT jsonb_agg(
          jsonb_build_object(
            'id', r.id,
            'created_at', r.created_at,
            'status', r.status,
            'event_id', r.event_id,
            'event_title', e.title,
            'event_capacity', e.capacity,
            'price_cents', r.price_cents,
            'checked_in_at', r.checked_in_at
          )
          ORDER BY r.created_at
        )
        FROM event_registrations r
        LEFT JOIN events e ON e.id = r.event_id
        WHERE r.entity_id = p_entity_id
          AND r.created_at >= p_from AND r.created_at <= p_to),
        '[]'::jsonb
      ),
    'registrations_prev',
      COALESCE(
        (SELECT jsonb_agg(jsonb_build_object('status', r.status))
        FROM event_registrations r
        WHERE r.entity_id = p_entity_id
          AND r.created_at >= p_prev_from AND r.created_at <= p_prev_to),
        '[]'::jsonb
      ),
    'orders_cur',
      COALESCE(
        (SELECT jsonb_agg(
          jsonb_build_object(
            'id', o.id,
            'paid_at', o.paid_at,
            'total_cents', o.total_cents,
            'event_id', o.event_id
          )
          ORDER BY o.paid_at
        )
        FROM orders o
        WHERE o.entity_id = p_entity_id
          AND o.order_kind = 'event_ticket'
          AND o.status = 'paid'
          AND o.paid_at >= p_from AND o.paid_at <= p_to),
        '[]'::jsonb
      ),
    'revenue_cur',
      COALESCE((
        SELECT SUM(o.total_cents)
        FROM orders o
        WHERE o.entity_id = p_entity_id
          AND o.order_kind = 'event_ticket'
          AND o.status = 'paid'
          AND o.paid_at >= p_from AND o.paid_at <= p_to
      ), 0),
    'revenue_prev',
      COALESCE((
        SELECT SUM(o.total_cents)
        FROM orders o
        WHERE o.entity_id = p_entity_id
          AND o.order_kind = 'event_ticket'
          AND o.status = 'paid'
          AND o.paid_at >= p_prev_from AND o.paid_at <= p_prev_to
      ), 0)
  );
$$;
