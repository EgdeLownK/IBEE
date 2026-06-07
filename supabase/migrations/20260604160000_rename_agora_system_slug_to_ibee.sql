-- =============================================================================
-- Migration : Rebrand Agora → IBEE — rename du profil système
-- Le profil système '__agora__' (entity orpheline, user_id NULL) devient
-- '__ibee__'. display_name et bio sont alignés sur la nouvelle marque.
-- Pas de table entity_slug_history : aucun historique de slug à mettre à jour.
-- =============================================================================

UPDATE public.entity
SET
  slug = '__ibee__',
  display_name = 'IBEE',
  bio = 'IBEE est une plateforme française qui transforme chaque solopreneur en un site web personnel professionnel en 8 minutes. Être trouvé, compris, contacté, payé, mesuré — tout au même endroit. Conçue pour être nativement lue par Google, ChatGPT, Claude et Perplexity.'
WHERE slug = '__agora__';
