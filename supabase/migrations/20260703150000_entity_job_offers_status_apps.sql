-- =============================================================================
-- Migration: entity_job_offers_status_apps
-- 1. Refonte du statut des offres (active/inactive)
-- 2. Ajout de la table entity_job_applications
-- =============================================================================

CREATE TYPE entity_job_status_v2 AS ENUM ('active', 'inactive');

ALTER TABLE entity_job_offers ADD COLUMN status_v2 entity_job_status_v2 NOT NULL DEFAULT 'inactive';

-- Migration des données existantes
UPDATE entity_job_offers SET status_v2 = 'active' WHERE status::text = 'published';
UPDATE entity_job_offers SET status_v2 = 'inactive' WHERE status::text IN ('draft', 'closed');

-- Mise à jour de la policy de select public (car elle utilisait 'published')
DROP POLICY IF EXISTS "entity_job_offers_public_select" ON entity_job_offers;

-- Remplacement de la colonne
ALTER TABLE entity_job_offers DROP COLUMN status;
ALTER TABLE entity_job_offers RENAME COLUMN status_v2 TO status;

CREATE POLICY "entity_job_offers_public_select" ON entity_job_offers
  FOR SELECT TO anon, authenticated
  USING (status = 'active');


-- =============================================================================
-- Table des candidatures
-- =============================================================================
CREATE TYPE entity_job_application_status AS ENUM ('new', 'reviewed', 'accepted', 'rejected');

CREATE TABLE entity_job_applications (
  id              uuid                      PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id        uuid                      NOT NULL REFERENCES entity_job_offers(id) ON DELETE CASCADE,
  first_name      text                      NOT NULL,
  last_name       text                      NOT NULL,
  email           text                      NOT NULL,
  phone           text,
  message         text,
  resume_url      text,
  status          entity_job_application_status NOT NULL DEFAULT 'new',
  created_at      timestamptz               NOT NULL DEFAULT now(),
  updated_at      timestamptz               NOT NULL DEFAULT now()
);

CREATE INDEX idx_entity_job_apps_offer_id ON entity_job_applications (offer_id);

ALTER TABLE entity_job_applications ENABLE ROW LEVEL SECURITY;

-- Les postulants peuvent insérer leur candidature
CREATE POLICY "entity_job_apps_public_insert" ON entity_job_applications
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM entity_job_offers o
      WHERE o.id = offer_id AND o.status = 'active'
    )
  );

-- Le propriétaire de l'entité peut voir et modifier les candidatures de ses offres
CREATE POLICY "entity_job_apps_owner_select" ON entity_job_applications
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM entity_job_offers o
      JOIN entity e ON e.id = o.entity_id
      WHERE o.id = entity_job_applications.offer_id AND e.user_id = auth.uid()
    )
  );

CREATE POLICY "entity_job_apps_owner_update" ON entity_job_applications
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM entity_job_offers o
      JOIN entity e ON e.id = o.entity_id
      WHERE o.id = entity_job_applications.offer_id AND e.user_id = auth.uid()
    )
  );

CREATE POLICY "entity_job_apps_owner_delete" ON entity_job_applications
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM entity_job_offers o
      JOIN entity e ON e.id = o.entity_id
      WHERE o.id = entity_job_applications.offer_id AND e.user_id = auth.uid()
    )
  );
