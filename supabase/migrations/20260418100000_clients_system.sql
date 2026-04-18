-- ============================================================
-- Migration: clients_system
-- Table clients (per-entity CRM-lite) + booking linkage
-- Includes: triggers for auto-upsert from bookings + counter refresh
-- ============================================================

-- =====================
-- 1. Table clients
-- =====================

CREATE TABLE clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id uuid NOT NULL REFERENCES entity(id) ON DELETE CASCADE,
  email text NOT NULL CHECK (char_length(email) > 0 AND char_length(email) <= 320),
  name text NOT NULL DEFAULT '' CHECK (char_length(name) <= 200),
  phone text CHECK (phone IS NULL OR char_length(phone) <= 50),
  notes text CHECK (notes IS NULL OR char_length(notes) <= 5000),
  tags text[] NOT NULL DEFAULT '{}',
  bookings_count integer NOT NULL DEFAULT 0 CHECK (bookings_count >= 0),
  total_revenue_cents integer NOT NULL DEFAULT 0 CHECK (total_revenue_cents >= 0),
  last_booking_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE clients IS 'Per-entity directory of people who booked at least once. Auto-upserted from bookings by email (case-insensitive).';
COMMENT ON COLUMN clients.notes IS 'Private owner-only notes about this client.';
COMMENT ON COLUMN clients.tags IS 'Free-form owner tags (e.g. ["VIP", "pro", "warm-lead"]).';
COMMENT ON COLUMN clients.bookings_count IS 'Maintained by trigger. Counts non-cancelled bookings.';
COMMENT ON COLUMN clients.total_revenue_cents IS 'Maintained by trigger. Sums price of completed bookings.';

CREATE UNIQUE INDEX idx_clients_entity_email ON clients (entity_id, lower(email));
CREATE INDEX idx_clients_last_booking ON clients (entity_id, last_booking_at DESC NULLS LAST);

-- =====================
-- 2. Link bookings -> clients
-- =====================

ALTER TABLE bookings
  ADD COLUMN client_id uuid REFERENCES clients(id) ON DELETE SET NULL;

CREATE INDEX idx_bookings_client ON bookings (client_id);

-- =====================
-- 3. updated_at trigger (clients)
-- =====================

CREATE OR REPLACE FUNCTION clients_set_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_clients_set_updated_at
  BEFORE UPDATE ON clients
  FOR EACH ROW
  EXECUTE FUNCTION clients_set_updated_at();

-- =====================
-- 4. Upsert trigger: auto-create/link a client on booking insert
-- =====================

CREATE OR REPLACE FUNCTION upsert_client_from_booking() RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text := lower(trim(NEW.booker_email));
  v_client_id uuid;
BEGIN
  IF v_email = '' OR NEW.entity_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT id INTO v_client_id
  FROM clients
  WHERE entity_id = NEW.entity_id AND lower(email) = v_email
  LIMIT 1;

  IF v_client_id IS NULL THEN
    INSERT INTO clients (entity_id, email, name, phone, last_booking_at)
    VALUES (
      NEW.entity_id,
      v_email,
      COALESCE(NEW.booker_name, ''),
      NEW.booker_phone,
      NEW.start_at
    )
    RETURNING id INTO v_client_id;
  ELSE
    UPDATE clients
    SET
      name = CASE
        WHEN clients.name IS NULL OR clients.name = ''
          THEN COALESCE(NEW.booker_name, clients.name)
        ELSE clients.name
      END,
      phone = COALESCE(clients.phone, NEW.booker_phone),
      last_booking_at = GREATEST(
        COALESCE(clients.last_booking_at, NEW.start_at),
        NEW.start_at
      )
    WHERE id = v_client_id;
  END IF;

  NEW.client_id := v_client_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_upsert_client_on_booking
  BEFORE INSERT ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION upsert_client_from_booking();

-- =====================
-- 5. Counter refresh (bookings_count + revenue) on booking changes
-- =====================

CREATE OR REPLACE FUNCTION refresh_client_counters(p_client_id uuid) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_client_id IS NULL THEN RETURN; END IF;

  UPDATE clients c
  SET
    bookings_count = COALESCE((
      SELECT count(*)::int
      FROM bookings b
      WHERE b.client_id = p_client_id
        AND b.status IN ('pending', 'confirmed', 'completed')
    ), 0),
    total_revenue_cents = COALESCE((
      SELECT sum(COALESCE(at.promo_price_cents, at.price_cents, 0))::int
      FROM bookings b
      LEFT JOIN appointment_types at ON at.id = b.appointment_type_id
      WHERE b.client_id = p_client_id
        AND b.status = 'completed'
    ), 0)
  WHERE c.id = p_client_id;
END;
$$;

CREATE OR REPLACE FUNCTION trigger_refresh_client_counters() RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM refresh_client_counters(NEW.client_id);
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.client_id IS DISTINCT FROM OLD.client_id THEN
      PERFORM refresh_client_counters(OLD.client_id);
      PERFORM refresh_client_counters(NEW.client_id);
    ELSIF NEW.status IS DISTINCT FROM OLD.status THEN
      PERFORM refresh_client_counters(NEW.client_id);
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM refresh_client_counters(OLD.client_id);
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_refresh_client_counters_on_booking
  AFTER INSERT OR UPDATE OR DELETE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION trigger_refresh_client_counters();

-- =====================
-- 6. RLS — owner-only access
-- =====================

ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "clients_owner_select"
  ON clients FOR SELECT
  TO authenticated
  USING (entity_id IN (SELECT id FROM entity WHERE user_id = auth.uid()));

CREATE POLICY "clients_owner_update"
  ON clients FOR UPDATE
  TO authenticated
  USING (entity_id IN (SELECT id FROM entity WHERE user_id = auth.uid()))
  WITH CHECK (entity_id IN (SELECT id FROM entity WHERE user_id = auth.uid()));

CREATE POLICY "clients_owner_delete"
  ON clients FOR DELETE
  TO authenticated
  USING (entity_id IN (SELECT id FROM entity WHERE user_id = auth.uid()));

-- INSERT happens exclusively via the SECURITY DEFINER trigger on bookings.
-- No user-facing INSERT policy is needed; direct inserts by authenticated users
-- are blocked by default (RLS denies when no policy matches).

-- =====================
-- 7. Backfill clients from existing bookings
-- =====================

-- Create one client per (entity_id, email) pair found in bookings.
-- Takes the most recent booker_name/booker_phone for each pair.
INSERT INTO clients (entity_id, email, name, phone, last_booking_at)
SELECT
  entity_id,
  email,
  COALESCE(name, ''),
  phone,
  max_start_at
FROM (
  SELECT DISTINCT ON (entity_id, lower(trim(booker_email)))
    entity_id,
    lower(trim(booker_email)) AS email,
    booker_name AS name,
    booker_phone AS phone,
    (SELECT max(start_at) FROM bookings b2
     WHERE b2.entity_id = b.entity_id
       AND lower(trim(b2.booker_email)) = lower(trim(b.booker_email))
    ) AS max_start_at
  FROM bookings b
  WHERE booker_email IS NOT NULL AND trim(booker_email) <> ''
  ORDER BY entity_id, lower(trim(booker_email)), start_at DESC
) latest
ON CONFLICT DO NOTHING;

-- Link existing bookings to the clients we just created.
UPDATE bookings b
SET client_id = c.id
FROM clients c
WHERE c.entity_id = b.entity_id
  AND lower(c.email) = lower(trim(b.booker_email))
  AND b.client_id IS NULL;

-- Refresh counters for all backfilled clients.
DO $$
DECLARE
  c_id uuid;
BEGIN
  FOR c_id IN SELECT id FROM clients LOOP
    PERFORM refresh_client_counters(c_id);
  END LOOP;
END $$;
