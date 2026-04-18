-- Create entity table
CREATE TABLE entity (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  slug        text        UNIQUE NOT NULL,
  display_name text       NOT NULL,
  bio         text,
  avatar_url  text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- Function to auto-update updated_at
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger before update
CREATE TRIGGER trg_entity_updated_at
  BEFORE UPDATE ON entity
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

-- Enable RLS
ALTER TABLE entity ENABLE ROW LEVEL SECURITY;

-- Public read policy
CREATE POLICY "entity_select_public"
  ON entity
  FOR SELECT
  USING (true);

-- Seed row
INSERT INTO entity (slug, display_name, bio)
VALUES ('killian', 'Killian', 'Fondateur d''Agora. Test seed row.');
