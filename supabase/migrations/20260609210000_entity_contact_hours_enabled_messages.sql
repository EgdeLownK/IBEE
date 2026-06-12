-- Toggle horaires (désactivé par défaut) + messagerie IBEE vers le compte projet

ALTER TABLE entity_contact_info
  ADD COLUMN IF NOT EXISTS opening_hours_enabled boolean NOT NULL DEFAULT false;

ALTER TABLE entity_contact_info
  ALTER COLUMN message_enabled SET DEFAULT false;

COMMENT ON COLUMN entity_contact_info.opening_hours_enabled IS 'Afficher le sous-widget Horaires sur le widget Bio Accueil.';

CREATE TABLE IF NOT EXISTS entity_messages (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id       uuid        NOT NULL REFERENCES entity(id) ON DELETE CASCADE,
  sender_user_id  uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  sender_name     text        NOT NULL CHECK (char_length(sender_name) BETWEEN 1 AND 120),
  sender_email    text        NOT NULL CHECK (char_length(sender_email) BETWEEN 3 AND 320),
  body            text        NOT NULL CHECK (char_length(body) BETWEEN 1 AND 2000),
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_entity_messages_entity_created
  ON entity_messages (entity_id, created_at DESC);

COMMENT ON TABLE entity_messages IS 'Messages envoyés aux comptes projet via le widget Bio (messagerie IBEE).';

ALTER TABLE entity_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "entity_messages_insert_public" ON entity_messages;
CREATE POLICY "entity_messages_insert_public"
  ON entity_messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM entity_contact_info eci
      WHERE eci.entity_id = entity_messages.entity_id
        AND eci.message_enabled = true
    )
  );

DROP POLICY IF EXISTS "entity_messages_owner_select" ON entity_messages;
CREATE POLICY "entity_messages_owner_select"
  ON entity_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM entity e
      WHERE e.id = entity_messages.entity_id
        AND e.user_id = auth.uid()
    )
  );
