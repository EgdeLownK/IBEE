-- ============================================================
-- Migration: add_publication_slug
-- SEO-friendly URLs for publications: /{entity.slug}/news/{publication.slug}
-- ============================================================

-- 1. Enable unaccent extension
CREATE EXTENSION IF NOT EXISTS unaccent;

-- 2. Slugify function (pure text → slug)
CREATE OR REPLACE FUNCTION slugify(input TEXT)
RETURNS TEXT
LANGUAGE plpgsql IMMUTABLE
AS $$
BEGIN
  RETURN trim(both '-' from
    regexp_replace(
      regexp_replace(
        lower(unaccent(input)),
        '[^a-z0-9]+', '-', 'g'
      ),
      '-+', '-', 'g'
    )
  );
END;
$$;

-- 3. Generate unique slug per entity (handles collisions)
CREATE OR REPLACE FUNCTION generate_unique_publication_slug(
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
  -- Ensure non-empty slug
  IF base_slug = '' OR base_slug IS NULL THEN
    base_slug := 'publication';
  END IF;
  candidate := base_slug;

  WHILE EXISTS (
    SELECT 1 FROM publications
    WHERE entity_id = p_entity_id AND slug = candidate
  ) LOOP
    candidate := base_slug || '-' || counter;
    counter := counter + 1;
  END LOOP;

  RETURN candidate;
END;
$$;

-- 4. Add slug column (nullable first for backfill)
ALTER TABLE publications ADD COLUMN slug TEXT;

-- 5. Backfill existing publications
UPDATE publications
SET slug = generate_unique_publication_slug(entity_id, title)
WHERE slug IS NULL;

-- 6. Make slug NOT NULL after backfill
ALTER TABLE publications ALTER COLUMN slug SET NOT NULL;

-- 7. Unique index per entity
CREATE UNIQUE INDEX idx_publications_entity_slug ON publications (entity_id, slug);

-- 8. Trigger: auto-generate slug on INSERT
CREATE OR REPLACE FUNCTION set_publication_slug()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.slug IS NULL THEN
    NEW.slug := generate_unique_publication_slug(NEW.entity_id, NEW.title);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_publication_insert_set_slug
  BEFORE INSERT ON publications
  FOR EACH ROW
  EXECUTE FUNCTION set_publication_slug();

-- 9. Trigger: prevent title update after publication
CREATE OR REPLACE FUNCTION prevent_title_update_after_publish()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.status = 'published' AND OLD.published_at IS NOT NULL
     AND NEW.title IS DISTINCT FROM OLD.title THEN
    RAISE EXCEPTION 'Le titre ne peut pas être modifié après publication.';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_publication_update_prevent_title_change
  BEFORE UPDATE ON publications
  FOR EACH ROW
  EXECUTE FUNCTION prevent_title_update_after_publish();
