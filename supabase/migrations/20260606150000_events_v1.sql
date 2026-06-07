-- ============================================================
-- Migration: events_v1
-- Section Event du profil (décisions Killian 2026-06-06) :
--   - events : événements ponctuels (webinaire, atelier, meetup…)
--     avec kit de contenu complet (highlights, galerie, blocs, FAQ)
--   - event_registrations : inscriptions natives (nom/email),
--     auto-confirmées dans la limite de la jauge (capacity)
--   - Affichage public : events publiés à venir uniquement
-- ============================================================

-- ============================================================
-- 1. Enums
-- ============================================================
CREATE TYPE event_location_type AS ENUM ('online', 'in_person');
CREATE TYPE event_registration_status AS ENUM ('confirmed', 'cancelled');

-- ============================================================
-- 2. Table events
-- ============================================================
CREATE TABLE events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id uuid NOT NULL REFERENCES entity(id) ON DELETE CASCADE,
  title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 120),
  slug text NOT NULL CHECK (slug ~ '^[a-z0-9-]+$'),
  description text CHECK (description IS NULL OR char_length(description) <= 2000),
  start_at timestamptz NOT NULL,
  end_at timestamptz CHECK (end_at IS NULL OR end_at > start_at),
  location_type event_location_type NOT NULL DEFAULT 'online',
  location_details text CHECK (location_details IS NULL OR char_length(location_details) <= 300),
  price_cents integer CHECK (price_cents IS NULL OR price_cents >= 0),
  currency text NOT NULL DEFAULT 'EUR',
  capacity integer CHECK (capacity IS NULL OR capacity > 0),
  is_published boolean NOT NULL DEFAULT true,
  highlights jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(highlights) = 'array'),
  gallery_images text[] NOT NULL DEFAULT '{}',
  content_blocks jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(content_blocks) = 'array'),
  faq jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(faq) = 'array'),
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT events_slug_unique_per_entity UNIQUE (entity_id, slug)
);

COMMENT ON TABLE events IS 'Événements ponctuels (webinaire, atelier…). capacity NULL = places illimitées.';
COMMENT ON COLUMN events.location_details IS 'Adresse (in_person) ou lien visio (online). Affiché publiquement.';
COMMENT ON COLUMN events.faq IS 'FAQ rédigée par le vendeur : array de {question ≤200, answer ≤1000}, max 10 (validé côté API).';

CREATE INDEX idx_events_entity_start ON events (entity_id, start_at) WHERE is_published = true;

CREATE TRIGGER trg_events_updated_at
  BEFORE UPDATE ON events
  FOR EACH ROW EXECUTE FUNCTION trg_products_set_updated_at();

-- ============================================================
-- 3. Table event_registrations
-- ============================================================
CREATE TABLE event_registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  entity_id uuid NOT NULL REFERENCES entity(id) ON DELETE CASCADE,
  attendee_name text NOT NULL CHECK (char_length(attendee_name) BETWEEN 1 AND 200),
  attendee_email text NOT NULL CHECK (char_length(attendee_email) BETWEEN 1 AND 320),
  attendee_phone text CHECK (attendee_phone IS NULL OR char_length(attendee_phone) <= 30),
  message text CHECK (message IS NULL OR char_length(message) <= 2000),
  status event_registration_status NOT NULL DEFAULT 'confirmed',
  created_at timestamptz NOT NULL DEFAULT now(),

  -- Pas de double inscription au même event avec le même email
  CONSTRAINT event_registrations_unique_email UNIQUE (event_id, attendee_email)
);

COMMENT ON TABLE event_registrations IS 'Inscriptions aux events. Auto-confirmées dans la limite de la jauge (contrôle API).';

CREATE INDEX idx_event_registrations_event ON event_registrations (event_id, status);

-- ============================================================
-- 4. RLS — events
-- ============================================================
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- Lecture publique : events publiés (le filtre "à venir" est applicatif)
CREATE POLICY "events_public_select"
  ON events FOR SELECT
  TO anon, authenticated
  USING (is_published = true);

-- Owner : lecture complète (brouillons inclus) + CRUD
CREATE POLICY "events_owner_select"
  ON events FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM entity WHERE id = entity_id AND user_id = auth.uid())
  );

CREATE POLICY "events_owner_insert"
  ON events FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM entity WHERE id = entity_id AND user_id = auth.uid())
  );

CREATE POLICY "events_owner_update"
  ON events FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM entity WHERE id = entity_id AND user_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM entity WHERE id = entity_id AND user_id = auth.uid())
  );

CREATE POLICY "events_owner_delete"
  ON events FOR DELETE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM entity WHERE id = entity_id AND user_id = auth.uid())
  );

-- ============================================================
-- 5. RLS — event_registrations
-- ============================================================
ALTER TABLE event_registrations ENABLE ROW LEVEL SECURITY;

-- Inscription publique (anonyme ou connecté) — même surface que bookings.
-- La jauge (capacity) est contrôlée côté API avant insertion.
CREATE POLICY "event_registrations_public_insert"
  ON event_registrations FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Lecture owner : le vendeur voit les inscrits à ses events
CREATE POLICY "event_registrations_owner_select"
  ON event_registrations FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM entity WHERE id = entity_id AND user_id = auth.uid())
  );

-- ============================================================
-- 6. Jauge publique : compter les inscrits confirmés SANS exposer
--    leurs données (la table est owner-only en lecture).
--    SECURITY DEFINER : ne renvoie qu'un entier.
-- ============================================================
CREATE OR REPLACE FUNCTION count_event_registrations(p_event_id uuid)
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT count(*)::integer
  FROM event_registrations
  WHERE event_id = p_event_id AND status = 'confirmed';
$$;

GRANT EXECUTE ON FUNCTION count_event_registrations(uuid) TO anon, authenticated;
