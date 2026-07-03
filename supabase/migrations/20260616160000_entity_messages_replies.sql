-- Réponses owner + clé de fil conversationnel

ALTER TABLE entity_messages
  ADD COLUMN IF NOT EXISTS direction text NOT NULL DEFAULT 'inbound'
    CHECK (direction IN ('inbound', 'outbound'));

ALTER TABLE entity_messages
  ADD COLUMN IF NOT EXISTS thread_key text;

UPDATE entity_messages
SET thread_key = lower(trim(sender_email))
WHERE thread_key IS NULL;

ALTER TABLE entity_messages
  ALTER COLUMN thread_key SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_entity_messages_entity_thread_created
  ON entity_messages (entity_id, thread_key, created_at ASC);

COMMENT ON COLUMN entity_messages.direction IS 'inbound = visiteur, outbound = réponse du compte projet.';
COMMENT ON COLUMN entity_messages.thread_key IS 'Email client normalisé — clé de regroupement du fil.';

DROP POLICY IF EXISTS "entity_messages_owner_insert_outbound" ON entity_messages;
CREATE POLICY "entity_messages_owner_insert_outbound"
  ON entity_messages FOR INSERT
  WITH CHECK (
    direction = 'outbound'
    AND EXISTS (
      SELECT 1 FROM entity e
      WHERE e.id = entity_messages.entity_id
        AND e.user_id = auth.uid()
    )
  );
