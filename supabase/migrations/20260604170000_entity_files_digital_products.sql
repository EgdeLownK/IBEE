-- =============================================================================
-- Migration : Fichiers vendeur (pré-Drive) + produit digital par fichier
--
-- 1. Table entity_files : catalogue des fichiers uploadés par un vendeur.
--    Socle de la future section "Drive" — l'overlay produit digital s'en sert
--    dès maintenant (upload direct ou réutilisation d'un fichier existant).
-- 2. Bucket privé product-files : un fichier payant ne doit JAMAIS être
--    accessible publiquement. La livraison à l'acheteur se fera par lien
--    signé (chantier paiement, à venir).
-- 3. products.digital_file_id : référence vers entity_files.
--    digital_file_url est déprécié (conservé pour compat, plus alimenté).
-- =============================================================================

-- 1. Table entity_files ------------------------------------------------------

CREATE TABLE entity_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id uuid NOT NULL REFERENCES entity(id) ON DELETE CASCADE,
  name text NOT NULL,
  storage_path text NOT NULL UNIQUE,
  mime_type text,
  size_bytes bigint NOT NULL CHECK (size_bytes >= 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX entity_files_entity_id_idx ON entity_files(entity_id);

ALTER TABLE entity_files ENABLE ROW LEVEL SECURITY;

-- RLS : owner uniquement — les fichiers d'un vendeur ne sont jamais
-- énumérables publiquement (même modèle que discount_codes).
CREATE POLICY "entity_files_owner_select"
  ON entity_files FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM entity WHERE id = entity_id AND user_id = auth.uid())
  );

CREATE POLICY "entity_files_owner_insert"
  ON entity_files FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM entity WHERE id = entity_id AND user_id = auth.uid())
  );

CREATE POLICY "entity_files_owner_update"
  ON entity_files FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM entity WHERE id = entity_id AND user_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM entity WHERE id = entity_id AND user_id = auth.uid())
  );

CREATE POLICY "entity_files_owner_delete"
  ON entity_files FOR DELETE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM entity WHERE id = entity_id AND user_id = auth.uid())
  );

-- 2. Bucket privé product-files ----------------------------------------------

INSERT INTO storage.buckets (id, name, public)
VALUES ('product-files', 'product-files', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies : chaque user n'accède qu'à son préfixe {user_id}/...
CREATE POLICY "product_files_owner_insert"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'product-files'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "product_files_owner_select"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'product-files'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "product_files_owner_delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'product-files'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- 3. products.digital_file_id -------------------------------------------------

ALTER TABLE products
  ADD COLUMN digital_file_id uuid REFERENCES entity_files(id) ON DELETE SET NULL;

COMMENT ON COLUMN products.digital_file_id IS
  'Fichier livré du produit digital (entity_files). Remplace digital_file_url (déprécié).';
