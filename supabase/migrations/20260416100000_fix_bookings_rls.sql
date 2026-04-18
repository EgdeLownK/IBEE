-- Fix: bookings_owner_all FOR ALL policy blocks anonymous inserts
-- because WITH CHECK fails when auth.uid() is null.
-- Split into SELECT/UPDATE/DELETE for owner, keep INSERT open for public.

DROP POLICY IF EXISTS "bookings_owner_all" ON bookings;
DROP POLICY IF EXISTS "bookings_public_insert" ON bookings;

-- Owner can read their bookings
CREATE POLICY "bookings_owner_select"
  ON bookings FOR SELECT
  USING (EXISTS (SELECT 1 FROM entity WHERE id = entity_id AND user_id = auth.uid()));

-- Owner can update their bookings
CREATE POLICY "bookings_owner_update"
  ON bookings FOR UPDATE
  USING (EXISTS (SELECT 1 FROM entity WHERE id = entity_id AND user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM entity WHERE id = entity_id AND user_id = auth.uid()));

-- Owner can delete their bookings
CREATE POLICY "bookings_owner_delete"
  ON bookings FOR DELETE
  USING (EXISTS (SELECT 1 FROM entity WHERE id = entity_id AND user_id = auth.uid()));

-- Anyone can create a booking (public booking form)
CREATE POLICY "bookings_public_insert"
  ON bookings FOR INSERT
  WITH CHECK (true);
