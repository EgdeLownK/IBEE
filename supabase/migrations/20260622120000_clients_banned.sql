-- ============================================================
-- Migration: clients_banned
-- Bannissement client par email (profil entité)
-- ============================================================

ALTER TABLE clients
  ADD COLUMN is_banned boolean NOT NULL DEFAULT false,
  ADD COLUMN banned_at timestamptz;

COMMENT ON COLUMN clients.is_banned IS 'Client banni du profil : plus de réservation ni inscription event.';
COMMENT ON COLUMN clients.banned_at IS 'Date du bannissement (dernier si ré-banni).';

CREATE INDEX idx_clients_banned ON clients (entity_id, banned_at DESC NULLS LAST)
  WHERE is_banned = true;

-- ============================================================
-- Ban / unban (upsert client si absent — ex. participant event)
-- ============================================================

CREATE OR REPLACE FUNCTION ban_entity_client(
  p_entity_id uuid,
  p_email text,
  p_name text DEFAULT '',
  p_phone text DEFAULT NULL
) RETURNS clients
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text := lower(trim(p_email));
  v_client_id uuid;
  v_row clients;
BEGIN
  IF v_email = '' THEN
    RAISE EXCEPTION 'Email requis';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM entity WHERE id = p_entity_id AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  SELECT id INTO v_client_id
  FROM clients
  WHERE entity_id = p_entity_id AND lower(email) = v_email
  LIMIT 1;

  IF v_client_id IS NULL THEN
    INSERT INTO clients (entity_id, email, name, phone, is_banned, banned_at)
    VALUES (
      p_entity_id,
      v_email,
      COALESCE(NULLIF(trim(p_name), ''), ''),
      NULLIF(trim(p_phone), ''),
      true,
      now()
    )
    RETURNING * INTO v_row;
  ELSE
    UPDATE clients
    SET
      is_banned = true,
      banned_at = now(),
      name = CASE
        WHEN name = '' OR name IS NULL THEN COALESCE(NULLIF(trim(p_name), ''), name)
        ELSE name
      END,
      phone = COALESCE(phone, NULLIF(trim(p_phone), ''))
    WHERE id = v_client_id
    RETURNING * INTO v_row;
  END IF;

  RETURN v_row;
END;
$$;

CREATE OR REPLACE FUNCTION unban_entity_client(
  p_entity_id uuid,
  p_client_id uuid
) RETURNS clients
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row clients;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM entity WHERE id = p_entity_id AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  UPDATE clients
  SET is_banned = false, banned_at = NULL
  WHERE id = p_client_id AND entity_id = p_entity_id
  RETURNING * INTO v_row;

  IF v_row.id IS NULL THEN
    RAISE EXCEPTION 'Client introuvable';
  END IF;

  RETURN v_row;
END;
$$;

GRANT EXECUTE ON FUNCTION ban_entity_client(uuid, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION unban_entity_client(uuid, uuid) TO authenticated;
