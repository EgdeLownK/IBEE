-- ============================================================
-- Migration: add_appointment_type_slug
-- SEO-friendly URLs for services: /{entity.slug}/services/{appointment.slug}
-- Réutilise slugify() et unaccent déjà créés par la migration publications.
-- ============================================================

-- 1. Generate unique slug per entity for appointment_types
CREATE OR REPLACE FUNCTION generate_unique_appointment_slug(
  p_entity_id UUID,
  p_title TEXT
)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  base_slug TEXT;
  candidate TEXT;
  counter INT := 2;
BEGIN
  base_slug := slugify(p_title);
  IF base_slug = '' OR base_slug IS NULL THEN
    base_slug := 'service';
  END IF;
  candidate := base_slug;

  WHILE EXISTS (
    SELECT 1 FROM appointment_types
    WHERE entity_id = p_entity_id AND slug = candidate
  ) LOOP
    candidate := base_slug || '-' || counter;
    counter := counter + 1;
  END LOOP;

  RETURN candidate;
END;
$$;

-- 2. Add slug column (nullable first for backfill)
ALTER TABLE appointment_types ADD COLUMN slug TEXT;

-- 3. Backfill existing appointment types
UPDATE appointment_types
SET slug = generate_unique_appointment_slug(entity_id, title)
WHERE slug IS NULL;

-- 4. Make slug NOT NULL after backfill
ALTER TABLE appointment_types ALTER COLUMN slug SET NOT NULL;

-- 5. Unique index per entity
CREATE UNIQUE INDEX idx_appointment_types_entity_slug ON appointment_types (entity_id, slug);

-- 6. Trigger: auto-generate slug on INSERT
CREATE OR REPLACE FUNCTION set_appointment_type_slug()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.slug IS NULL THEN
    NEW.slug := generate_unique_appointment_slug(NEW.entity_id, NEW.title);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_appointment_type_insert_set_slug
  BEFORE INSERT ON appointment_types
  FOR EACH ROW
  EXECUTE FUNCTION set_appointment_type_slug();
