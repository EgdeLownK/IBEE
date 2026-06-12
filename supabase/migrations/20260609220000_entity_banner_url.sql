-- Bannière profil hero (800×172 affichage, URL publique storage)
ALTER TABLE entity ADD COLUMN IF NOT EXISTS banner_url text;

COMMENT ON COLUMN entity.banner_url IS 'URL publique de la bannière du profil hero';
