-- Ajout téléphone pro (widget Bio) — SQL Editor, sans DROP
ALTER TABLE entity_contact_info
  ADD COLUMN IF NOT EXISTS contact_phone text,
  ADD COLUMN IF NOT EXISTS contact_phone_public boolean NOT NULL DEFAULT true;
