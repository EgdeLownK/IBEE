-- Suivi envoi emails transactionnels rendez-vous

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS confirmation_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS reminder_sent_at timestamptz;

COMMENT ON COLUMN bookings.confirmation_sent_at IS 'Horodatage envoi email de confirmation au client.';
COMMENT ON COLUMN bookings.reminder_sent_at IS 'Horodatage envoi rappel 24h avant le créneau.';

CREATE INDEX IF NOT EXISTS idx_bookings_reminder_pending
  ON bookings (start_at)
  WHERE status = 'confirmed' AND reminder_sent_at IS NULL;
