-- Support des medias (galerie) d'offre d'emploi.
--
-- 1. Table entity_job_offer_media, calquee sur product_media
--    (20260603120000_products_v1.sql:114-126, meme colonnes/types/index,
--    meme ON DELETE CASCADE) mais avec des policies RLS basees sur
--    entity_user_has_permission(entity_id, 'talent') -- comme les policies
--    "team_*" d'entity_job_offers/entity_job_applications
--    (20260725100000_entity_job_team_permission_policies.sql) -- au lieu du
--    controle "e.user_id = auth.uid()" que product_media utilise. Type enum
--    distinct de product_media_type (entity_job_offer_media_type, memes
--    valeurs) pour ne pas coupler les deux domaines via un type partage.
--
-- 2. Limites sur le bucket publication-media (aujourd'hui file_size_limit et
--    allowed_mime_types = null, donc contournables par un appel direct a
--    l'API Storage). Valeurs reprises de product-actions.ts (MAX_IMAGE_BYTES,
--    MAX_VIDEO_BYTES, IMAGE_TYPES, VIDEO_TYPES) -- identiques a
--    history-actions.ts sur la partie image. file_size_limit est un
--    scalaire unique par bucket (pas de limite differenciee par type) :
--    200 Mo retenu (le plus large des deux) pour ne pas casser les uploads
--    video deja permis aujourd'hui pour les produits. Verifie sans effet
--    retroactif sur les 208 fichiers existants (aucun trigger/contrainte
--    CHECK sur storage.objects ne reference ces colonnes -- uniquement
--    applique par l'API Storage au moment de l'upload).
--
-- 3. Reconstitution de publication-media (bucket + ses 3 policies
--    INSERT/UPDATE/DELETE), absent de toute migration jusqu'ici (cree
--    directement en prod, meme classe de derive que entity_user_has_permission
--    -- voir 20260725100000). Idempotent (ON CONFLICT DO NOTHING / DROP
--    POLICY IF EXISTS) pour pouvoir etre rejouee sur une prod qui a deja
--    ce bucket. Aucune policy SELECT ajoutee : la lecture publique passe
--    par public = true, c'est l'etat reel constate et voulu.

-- =====================================================================
-- 1. entity_job_offer_media
-- =====================================================================

CREATE TYPE entity_job_offer_media_type AS ENUM ('image', 'video');

CREATE TABLE entity_job_offer_media (
  id             uuid                          PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id       uuid                          NOT NULL REFERENCES entity_job_offers(id) ON DELETE CASCADE,
  url            text                          NOT NULL,
  media_type     entity_job_offer_media_type   NOT NULL,
  alt_text       text,
  display_order  integer                       NOT NULL DEFAULT 0,
  created_at     timestamptz                   NOT NULL DEFAULT now()
);

COMMENT ON TABLE entity_job_offer_media IS 'Galerie média (image/vidéo) d''une offre d''emploi. La première (display_order = 0) sert de vignette sur les cartes.';

CREATE INDEX idx_entity_job_offer_media_offer_order ON entity_job_offer_media (offer_id, display_order);

ALTER TABLE entity_job_offer_media ENABLE ROW LEVEL SECURITY;

-- Public : media des offres actives (miroir exact d'entity_job_offers_public_select).
CREATE POLICY "entity_job_offer_media_public_select" ON entity_job_offer_media
  FOR SELECT TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM entity_job_offers o
      WHERE o.id = entity_job_offer_media.offer_id AND o.status = 'active'
    )
  );

-- Equipe (proprietaire ou permission 'talent' sur l'entite) : meme mecanisme
-- que entity_job_offers_team_*/entity_job_apps_team_* (20260725100000).
CREATE POLICY "entity_job_offer_media_team_select" ON entity_job_offer_media
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM entity_job_offers o
      WHERE o.id = entity_job_offer_media.offer_id
        AND entity_user_has_permission(o.entity_id, 'talent')
    )
  );

CREATE POLICY "entity_job_offer_media_team_insert" ON entity_job_offer_media
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM entity_job_offers o
      WHERE o.id = entity_job_offer_media.offer_id
        AND entity_user_has_permission(o.entity_id, 'talent')
    )
  );

CREATE POLICY "entity_job_offer_media_team_update" ON entity_job_offer_media
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM entity_job_offers o
      WHERE o.id = entity_job_offer_media.offer_id
        AND entity_user_has_permission(o.entity_id, 'talent')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM entity_job_offers o
      WHERE o.id = entity_job_offer_media.offer_id
        AND entity_user_has_permission(o.entity_id, 'talent')
    )
  );

CREATE POLICY "entity_job_offer_media_team_delete" ON entity_job_offer_media
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM entity_job_offers o
      WHERE o.id = entity_job_offer_media.offer_id
        AND entity_user_has_permission(o.entity_id, 'talent')
    )
  );

-- =====================================================================
-- 3. Reconstitution de publication-media (bucket + policies), idempotent
--    -- executee AVANT la section 2 (limites) : sur un environnement ou le
--    bucket n'existe pas encore (local/CI, rejoue depuis zero), l'UPDATE de
--    la section 2 ne trouverait aucune ligne si le bucket n'est pas cree en
--    premier. Sur la prod (bucket deja existant), l'INSERT ci-dessous est un
--    no-op (ON CONFLICT DO NOTHING) et l'ordre n'a pas d'incidence. Numerotee
--    "3" pour rester alignee avec l'ordre de presentation demande, executee
--    en premier des deux sections storage pour rester idempotente partout.
-- =====================================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('publication-media', 'publication-media', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "publication_media_insert_own" ON storage.objects;
DROP POLICY IF EXISTS "publication_media_update_own" ON storage.objects;
DROP POLICY IF EXISTS "publication_media_delete_own" ON storage.objects;

CREATE POLICY "publication_media_insert_own"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'publication-media'
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = (auth.uid())::text
);

CREATE POLICY "publication_media_update_own"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'publication-media'
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = (auth.uid())::text
)
WITH CHECK (
  bucket_id = 'publication-media'
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = (auth.uid())::text
);

CREATE POLICY "publication_media_delete_own"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'publication-media'
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = (auth.uid())::text
);

-- =====================================================================
-- 2. Limites sur le bucket publication-media
-- =====================================================================

UPDATE storage.buckets
SET
  file_size_limit = 209715200, -- 200 Mo (MAX_VIDEO_BYTES, product-actions.ts:62)
  allowed_mime_types = ARRAY[
    'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif', -- IMAGE_TYPES (product-actions.ts:28, identique history-actions.ts:11)
    'video/mp4', 'video/webm'                                          -- VIDEO_TYPES (product-actions.ts:29)
  ]
WHERE id = 'publication-media';

NOTIFY pgrst, 'reload schema';
