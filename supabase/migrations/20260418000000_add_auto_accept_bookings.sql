-- Add auto-accept flag to appointment_types.
-- When true, new bookings are created with status='confirmed' instead of 'pending'.
-- Defaults to true for a smoother out-of-the-box experience.

ALTER TABLE appointment_types
  ADD COLUMN auto_accept_bookings boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN appointment_types.auto_accept_bookings IS
  'When true, bookings are auto-confirmed on creation. When false, they require manual owner confirmation (status=pending).';
