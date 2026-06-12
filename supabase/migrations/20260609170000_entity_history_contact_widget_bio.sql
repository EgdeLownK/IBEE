-- Menu Histoire (contenu texte) + infos contact/horaires (widget Bio) + type widget_bio
-- Idempotent : safe si entity_history a déjà été créée partiellement.

ALTER TYPE home_widget_type ADD VALUE IF NOT EXISTS 'widget_bio';

-- Contenu du menu Histoire (1 texte par profil)
CREATE TABLE IF NOT EXISTS entity_history (
  entity_id   uuid        PRIMARY KEY REFERENCES entity(id) ON DELETE CASCADE,
  content     text        NOT NULL DEFAULT '',
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE entity_history IS 'Texte du menu Histoire — source unique pour la section profil et le widget Accueil.';

DROP TRIGGER IF EXISTS trg_entity_history_updated_at ON entity_history;
CREATE TRIGGER trg_entity_history_updated_at
  BEFORE UPDATE ON entity_history
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Infos pro affichées dans le widget Bio (horaires, email, message)
CREATE TABLE IF NOT EXISTS entity_contact_info (
  entity_id              uuid        PRIMARY KEY REFERENCES entity(id) ON DELETE CASCADE,
  contact_email          text,
  contact_email_public   boolean     NOT NULL DEFAULT true,
  message_enabled        boolean     NOT NULL DEFAULT true,
  opening_hours          jsonb       NOT NULL DEFAULT '[]'::jsonb,
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE entity_contact_info IS 'Horaires d''ouverture et contact pro pour le widget Bio Accueil.';
COMMENT ON COLUMN entity_contact_info.opening_hours IS 'Tableau JSON : [{day_of_week:0-6, closed:bool, start_time:"HH:MM", end_time:"HH:MM"}]. 0=dim…6=sam.';

DROP TRIGGER IF EXISTS trg_entity_contact_info_updated_at ON entity_contact_info;
CREATE TRIGGER trg_entity_contact_info_updated_at
  BEFORE UPDATE ON entity_contact_info
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE entity_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE entity_contact_info ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "entity_history_select_public" ON entity_history;
CREATE POLICY "entity_history_select_public"
  ON entity_history FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "entity_history_owner_insert" ON entity_history;
CREATE POLICY "entity_history_owner_insert"
  ON entity_history FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM entity WHERE id = entity_id AND user_id = auth.uid())
  );

DROP POLICY IF EXISTS "entity_history_owner_update" ON entity_history;
CREATE POLICY "entity_history_owner_update"
  ON entity_history FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM entity WHERE id = entity_id AND user_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM entity WHERE id = entity_id AND user_id = auth.uid())
  );

DROP POLICY IF EXISTS "entity_history_owner_delete" ON entity_history;
CREATE POLICY "entity_history_owner_delete"
  ON entity_history FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM entity WHERE id = entity_id AND user_id = auth.uid())
  );

DROP POLICY IF EXISTS "entity_contact_info_select_public" ON entity_contact_info;
CREATE POLICY "entity_contact_info_select_public"
  ON entity_contact_info FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "entity_contact_info_owner_insert" ON entity_contact_info;
CREATE POLICY "entity_contact_info_owner_insert"
  ON entity_contact_info FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM entity WHERE id = entity_id AND user_id = auth.uid())
  );

DROP POLICY IF EXISTS "entity_contact_info_owner_update" ON entity_contact_info;
CREATE POLICY "entity_contact_info_owner_update"
  ON entity_contact_info FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM entity WHERE id = entity_id AND user_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM entity WHERE id = entity_id AND user_id = auth.uid())
  );

DROP POLICY IF EXISTS "entity_contact_info_owner_delete" ON entity_contact_info;
CREATE POLICY "entity_contact_info_owner_delete"
  ON entity_contact_info FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM entity WHERE id = entity_id AND user_id = auth.uid())
  );
