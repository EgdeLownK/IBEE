-- =============================================================================
-- Migration : Dossiers Drive (entity_folders) + lien fichiers
-- =============================================================================

CREATE TABLE entity_folders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id uuid NOT NULL REFERENCES entity(id) ON DELETE CASCADE,
  parent_id uuid REFERENCES entity_folders(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (char_length(trim(name)) > 0 AND char_length(name) <= 120),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX entity_folders_entity_id_idx ON entity_folders(entity_id);
CREATE INDEX entity_folders_parent_id_idx ON entity_folders(parent_id);

CREATE UNIQUE INDEX entity_folders_unique_name_per_parent_idx
  ON entity_folders (
    entity_id,
    COALESCE(parent_id, '00000000-0000-0000-0000-000000000000'::uuid),
    lower(trim(name))
  );

ALTER TABLE entity_files
  ADD COLUMN folder_id uuid REFERENCES entity_folders(id) ON DELETE SET NULL;

CREATE INDEX entity_files_folder_id_idx ON entity_files(folder_id);

ALTER TABLE entity_folders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "entity_folders_owner_select"
  ON entity_folders FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM entity WHERE id = entity_id AND user_id = auth.uid())
  );

CREATE POLICY "entity_folders_owner_insert"
  ON entity_folders FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM entity WHERE id = entity_id AND user_id = auth.uid())
  );

CREATE POLICY "entity_folders_owner_update"
  ON entity_folders FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM entity WHERE id = entity_id AND user_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM entity WHERE id = entity_id AND user_id = auth.uid())
  );

CREATE POLICY "entity_folders_owner_delete"
  ON entity_folders FOR DELETE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM entity WHERE id = entity_id AND user_id = auth.uid())
  );

COMMENT ON TABLE entity_folders IS
  'Dossiers du Drive vendeur — arborescence par profil (entity).';

COMMENT ON COLUMN entity_files.folder_id IS
  'Dossier parent du fichier dans le Drive (NULL = racine du profil).';
