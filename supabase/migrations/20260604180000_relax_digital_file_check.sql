-- =============================================================================
-- Migration : produit digital valide avec digital_file_id OU digital_file_url
-- Le CHECK products_digital_requires_file (products_v1) exigeait
-- digital_file_url pour tout produit digital. Le fichier passe désormais par
-- entity_files (digital_file_id) ; l'URL reste acceptée pour la compat des
-- produits existants.
-- =============================================================================

ALTER TABLE products
  DROP CONSTRAINT products_digital_requires_file;

ALTER TABLE products
  ADD CONSTRAINT products_digital_requires_file
  CHECK (
    type <> 'digital'::product_type
    OR digital_file_url IS NOT NULL
    OR digital_file_id IS NOT NULL
  );
