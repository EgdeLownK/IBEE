-- ============================================================
-- Migration: in_person_enabled
-- Ajout de l'option de remise en main propre.
-- ============================================================

ALTER TABLE products
  ADD COLUMN in_person_enabled boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN products.in_person_enabled IS 'Remise en main propre active (physical).';

-- Le lieu de retrait n'est requis que si le click-and-collect est actif.
-- Un produit physical doit avoir au moins un mode de remise (pickup, delivery, in_person).
ALTER TABLE products DROP CONSTRAINT IF EXISTS products_physical_requires_fields;
ALTER TABLE products
  ADD CONSTRAINT products_physical_requires_fields CHECK (
    type <> 'physical' OR (
      physical_condition IS NOT NULL
      AND (pickup_enabled OR delivery_enabled OR in_person_enabled)
      AND (NOT pickup_enabled OR physical_pickup_location IS NOT NULL)
    )
  );
