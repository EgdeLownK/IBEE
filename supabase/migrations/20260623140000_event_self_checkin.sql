-- Check-in participant (auto-validation via code billet, sans compte staff)

CREATE OR REPLACE FUNCTION self_check_in_event_registration(
  p_event_id uuid,
  p_ticket_code text
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
  SELECT * INTO v_event
  FROM events
  WHERE id = p_event_id
    AND is_published = true;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('status', 'invalid');
  END IF;

  IF date_trunc('day', v_event.start_at AT TIME ZONE 'UTC')
     > date_trunc('day', now() AT TIME ZONE 'UTC') THEN
    RETURN jsonb_build_object('status', 'not_open');
  END IF;

  SELECT * INTO v_reg
  FROM event_registrations
  WHERE event_id = p_event_id
    AND upper(trim(ticket_code)) = upper(trim(p_ticket_code))
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('status', 'invalid');
  END IF;

  IF v_reg.status = 'cancelled' THEN
    RETURN jsonb_build_object('status', 'cancelled', 'registration_id', v_reg.id);
  END IF;

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
    'event_title', v_event.title,
    'ticket_type_title', v_type_title
  );
END;
$$;

GRANT EXECUTE ON FUNCTION self_check_in_event_registration(uuid, text) TO anon, authenticated;
