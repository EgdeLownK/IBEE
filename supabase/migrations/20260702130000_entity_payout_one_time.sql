-- Virements uniques : schedule_id optionnel sur les transferts
ALTER TABLE entity_payout_transfers
  ALTER COLUMN schedule_id DROP NOT NULL;
