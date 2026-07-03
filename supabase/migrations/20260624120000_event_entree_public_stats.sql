-- Stats entrées publiques (page QR /entree, sans auth owner)

CREATE OR REPLACE FUNCTION get_event_entree_public_stats(p_event_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_confirmed bigint;
  v_checked_in bigint;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM events WHERE id = p_event_id AND is_published = true
  ) THEN
    RETURN NULL;
  END IF;

  SELECT count(*)::bigint INTO v_confirmed
  FROM event_registrations
  WHERE event_id = p_event_id
    AND status = 'confirmed';

  SELECT count(*)::bigint INTO v_checked_in
  FROM event_registrations
  WHERE event_id = p_event_id
    AND status = 'confirmed'
    AND checked_in_at IS NOT NULL;

  RETURN jsonb_build_object(
    'confirmed_count', v_confirmed,
    'checked_in_count', v_checked_in
  );
END;
$$;

GRANT EXECUTE ON FUNCTION get_event_entree_public_stats(uuid) TO anon, authenticated;
