-- Sessions QR pour remplir le contact lors d'une inscription manuelle (overlay Activité)

CREATE TABLE event_manual_reg_contact_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id uuid NOT NULL REFERENCES entity(id) ON DELETE CASCADE,
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE,
  attendee_name text,
  attendee_email text,
  attendee_phone text,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'filled', 'consumed', 'expired')),
  filled_at timestamptz,
  consumed_at timestamptz,
  expires_at timestamptz NOT NULL,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT event_manual_reg_contact_sessions_event_entity_fk
    CHECK (entity_id IS NOT NULL AND event_id IS NOT NULL)
);

CREATE INDEX idx_manual_reg_contact_sessions_token
  ON event_manual_reg_contact_sessions (token);

CREATE INDEX idx_manual_reg_contact_sessions_event_created
  ON event_manual_reg_contact_sessions (event_id, created_at DESC);

ALTER TABLE event_manual_reg_contact_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "manual_reg_contact_owner_select"
  ON event_manual_reg_contact_sessions FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM entity WHERE id = entity_id AND user_id = auth.uid())
  );

CREATE POLICY "manual_reg_contact_owner_insert"
  ON event_manual_reg_contact_sessions FOR INSERT
  TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND EXISTS (SELECT 1 FROM entity WHERE id = entity_id AND user_id = auth.uid())
    AND EXISTS (SELECT 1 FROM events WHERE id = event_id AND entity_id = entity_id)
  );

CREATE POLICY "manual_reg_contact_owner_update"
  ON event_manual_reg_contact_sessions FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM entity WHERE id = entity_id AND user_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM entity WHERE id = entity_id AND user_id = auth.uid())
  );

-- Métadonnées publiques pour la page participant (sans PII)
CREATE OR REPLACE FUNCTION get_manual_reg_contact_session_public(p_token text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_session event_manual_reg_contact_sessions%ROWTYPE;
  v_event_title text;
  v_entity_name text;
BEGIN
  SELECT * INTO v_session
  FROM event_manual_reg_contact_sessions
  WHERE token = trim(p_token)
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  IF v_session.expires_at < now() THEN
    UPDATE event_manual_reg_contact_sessions
    SET status = 'expired'
    WHERE id = v_session.id AND status = 'pending';
    RETURN NULL;
  END IF;

  IF v_session.status IN ('consumed', 'expired') THEN
    RETURN NULL;
  END IF;

  SELECT e.title, ent.display_name
  INTO v_event_title, v_entity_name
  FROM events e
  JOIN entity ent ON ent.id = e.entity_id
  WHERE e.id = v_session.event_id;

  RETURN jsonb_build_object(
    'event_title', v_event_title,
    'entity_name', v_entity_name,
    'status', v_session.status
  );
END;
$$;

-- Soumission participant (sans auth)
CREATE OR REPLACE FUNCTION submit_manual_reg_contact_session(
  p_token text,
  p_name text,
  p_email text,
  p_phone text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_session event_manual_reg_contact_sessions%ROWTYPE;
  v_name text := trim(p_name);
  v_email text := lower(trim(p_email));
  v_phone text := nullif(trim(coalesce(p_phone, '')), '');
BEGIN
  IF char_length(v_name) < 1 OR char_length(v_name) > 200 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Nom invalide.');
  END IF;

  IF char_length(v_email) < 5 OR position('@' in v_email) = 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Email invalide.');
  END IF;

  IF v_phone IS NOT NULL AND char_length(v_phone) > 30 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Téléphone invalide.');
  END IF;

  SELECT * INTO v_session
  FROM event_manual_reg_contact_sessions
  WHERE token = trim(p_token)
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Lien expiré ou invalide.');
  END IF;

  IF v_session.expires_at < now() THEN
    UPDATE event_manual_reg_contact_sessions
    SET status = 'expired'
    WHERE id = v_session.id;
    RETURN jsonb_build_object('ok', false, 'error', 'Ce lien a expiré.');
  END IF;

  IF v_session.status IN ('consumed', 'expired') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Ce lien n''est plus actif.');
  END IF;

  UPDATE event_manual_reg_contact_sessions
  SET
    attendee_name = v_name,
    attendee_email = v_email,
    attendee_phone = v_phone,
    status = 'filled',
    filled_at = now()
  WHERE id = v_session.id;

  RETURN jsonb_build_object('ok', true);
END;
$$;

GRANT EXECUTE ON FUNCTION get_manual_reg_contact_session_public(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION submit_manual_reg_contact_session(text, text, text, text) TO anon, authenticated;
