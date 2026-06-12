-- Téléphone pro pour le widget Bio Accueil
ALTER TABLE entity_contact_info
  ADD COLUMN IF NOT EXISTS contact_phone text,
  ADD COLUMN IF NOT EXISTS contact_phone_public boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN entity_contact_info.contact_phone IS 'Numéro de téléphone professionnel (widget Bio).';
COMMENT ON COLUMN entity_contact_info.contact_phone_public IS 'Afficher le téléphone publiquement sur le profil.';
