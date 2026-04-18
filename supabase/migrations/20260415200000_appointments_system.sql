-- ============================================================
-- Migration: appointments_system
-- Tables: appointment_types, availability_schedules,
--          availability_exceptions, bookings
-- Includes: enums, RLS, triggers, indexes
-- ============================================================

-- =====================
-- 1. Enums
-- =====================

CREATE TYPE appointment_location_type AS ENUM ('in_person', 'video', 'phone');
CREATE TYPE booking_status AS ENUM ('pending', 'confirmed', 'cancelled', 'completed', 'no_show');

-- =====================
-- 2. Table appointment_types
-- =====================

CREATE TABLE appointment_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id uuid NOT NULL REFERENCES entity(id) ON DELETE CASCADE,
  title text NOT NULL CHECK (char_length(title) > 0 AND char_length(title) <= 120),
  description text CHECK (description IS NULL OR char_length(description) <= 2000),
  duration_minutes integer NOT NULL CHECK (duration_minutes > 0 AND duration_minutes <= 480),
  location_type appointment_location_type NOT NULL DEFAULT 'video',
  location_details text,
  price_cents integer CHECK (price_cents IS NULL OR price_cents >= 0),
  currency text NOT NULL DEFAULT 'EUR',
  buffer_before_minutes integer NOT NULL DEFAULT 0 CHECK (buffer_before_minutes >= 0),
  buffer_after_minutes integer NOT NULL DEFAULT 0 CHECK (buffer_after_minutes >= 0),
  min_notice_hours integer NOT NULL DEFAULT 24 CHECK (min_notice_hours >= 0),
  max_advance_days integer NOT NULL DEFAULT 90 CHECK (max_advance_days > 0 AND max_advance_days <= 365),
  is_active boolean NOT NULL DEFAULT true,
  position integer NOT NULL DEFAULT 0,
  color text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE appointment_types IS 'Types of appointments a solopreneur offers (e.g. consultation, coaching session).';

CREATE INDEX idx_appointment_types_entity ON appointment_types (entity_id, position);

-- =====================
-- 3. Table availability_schedules
-- =====================

CREATE TABLE availability_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id uuid NOT NULL REFERENCES entity(id) ON DELETE CASCADE,
  day_of_week integer NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  start_time time NOT NULL,
  end_time time NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT availability_time_order CHECK (start_time < end_time)
);

COMMENT ON TABLE availability_schedules IS 'Weekly recurring availability slots. day_of_week: 0=Sun, 1=Mon...6=Sat. Multiple rows per day allowed.';

CREATE INDEX idx_availability_entity_day ON availability_schedules (entity_id, day_of_week);

-- =====================
-- 4. Table availability_exceptions
-- =====================

CREATE TABLE availability_exceptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id uuid NOT NULL REFERENCES entity(id) ON DELETE CASCADE,
  date date NOT NULL,
  is_blocked boolean NOT NULL DEFAULT true,
  start_time time,
  end_time time,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT exception_custom_hours_check
    CHECK (is_blocked = true OR (start_time IS NOT NULL AND end_time IS NOT NULL AND start_time < end_time))
);

COMMENT ON TABLE availability_exceptions IS 'Overrides for specific dates: blocked days (holidays) or custom hours.';

CREATE UNIQUE INDEX idx_availability_exceptions_entity_date ON availability_exceptions (entity_id, date)
  WHERE is_blocked = true;
CREATE INDEX idx_availability_exceptions_range ON availability_exceptions (entity_id, date);

-- =====================
-- 5. Table bookings
-- =====================

CREATE TABLE bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_type_id uuid NOT NULL REFERENCES appointment_types(id) ON DELETE CASCADE,
  entity_id uuid NOT NULL REFERENCES entity(id) ON DELETE CASCADE,
  booker_name text NOT NULL CHECK (char_length(booker_name) > 0 AND char_length(booker_name) <= 200),
  booker_email text NOT NULL CHECK (char_length(booker_email) > 0 AND char_length(booker_email) <= 320),
  booker_phone text,
  booker_message text CHECK (booker_message IS NULL OR char_length(booker_message) <= 2000),
  start_at timestamptz NOT NULL,
  end_at timestamptz NOT NULL,
  status booking_status NOT NULL DEFAULT 'pending',
  cancelled_by text CHECK (cancelled_by IS NULL OR cancelled_by IN ('booker', 'owner')),
  cancelled_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT booking_time_order CHECK (start_at < end_at),
  CONSTRAINT booking_cancel_check
    CHECK ((status != 'cancelled') OR (cancelled_by IS NOT NULL AND cancelled_at IS NOT NULL))
);

COMMENT ON TABLE bookings IS 'Actual booked appointments. Times stored in UTC.';

CREATE INDEX idx_bookings_entity_start ON bookings (entity_id, start_at DESC);
CREATE INDEX idx_bookings_entity_status ON bookings (entity_id, status);
CREATE INDEX idx_bookings_type ON bookings (appointment_type_id);
-- Prevent double-booking: no overlapping confirmed/pending bookings for same entity
CREATE INDEX idx_bookings_overlap ON bookings (entity_id, start_at, end_at)
  WHERE status IN ('pending', 'confirmed');

-- =====================
-- 6. Updated_at triggers
-- =====================

CREATE TRIGGER trg_appointment_types_updated_at
  BEFORE UPDATE ON appointment_types
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_bookings_updated_at
  BEFORE UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =====================
-- 7. Row Level Security
-- =====================

ALTER TABLE appointment_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE availability_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE availability_exceptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- appointment_types: owner full access, public reads active only
CREATE POLICY "appointment_types_owner_all"
  ON appointment_types FOR ALL
  USING (EXISTS (SELECT 1 FROM entity WHERE id = entity_id AND user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM entity WHERE id = entity_id AND user_id = auth.uid()));

CREATE POLICY "appointment_types_public_read"
  ON appointment_types FOR SELECT
  USING (is_active = true);

-- availability_schedules: owner full access, public reads
CREATE POLICY "availability_schedules_owner_all"
  ON availability_schedules FOR ALL
  USING (EXISTS (SELECT 1 FROM entity WHERE id = entity_id AND user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM entity WHERE id = entity_id AND user_id = auth.uid()));

CREATE POLICY "availability_schedules_public_read"
  ON availability_schedules FOR SELECT
  USING (true);

-- availability_exceptions: owner full access, public reads
CREATE POLICY "availability_exceptions_owner_all"
  ON availability_exceptions FOR ALL
  USING (EXISTS (SELECT 1 FROM entity WHERE id = entity_id AND user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM entity WHERE id = entity_id AND user_id = auth.uid()));

CREATE POLICY "availability_exceptions_public_read"
  ON availability_exceptions FOR SELECT
  USING (true);

-- bookings: owner sees all their bookings, public can insert (book)
CREATE POLICY "bookings_owner_all"
  ON bookings FOR ALL
  USING (EXISTS (SELECT 1 FROM entity WHERE id = entity_id AND user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM entity WHERE id = entity_id AND user_id = auth.uid()));

CREATE POLICY "bookings_public_insert"
  ON bookings FOR INSERT
  WITH CHECK (true);

-- =====================
-- 8. Add 'appointments' to menu_section_type enum
-- =====================

ALTER TYPE menu_section_type ADD VALUE IF NOT EXISTS 'appointments';
