-- =============================================================================
-- Talent & Recrutement
-- =============================================================================

CREATE TYPE entity_job_contract_type AS ENUM ('cdi', 'cdd', 'mission');
CREATE TYPE entity_job_status AS ENUM ('draft', 'published', 'closed');
CREATE TYPE entity_job_location_type AS ENUM ('remote', 'onsite', 'hybrid');

CREATE TABLE entity_job_offers (
  id              uuid                      PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id       uuid                      NOT NULL REFERENCES entity(id) ON DELETE CASCADE,
  title           text                      NOT NULL,
  contract_type   entity_job_contract_type  NOT NULL,
  status          entity_job_status         NOT NULL DEFAULT 'draft',
  location_type   entity_job_location_type  NOT NULL DEFAULT 'onsite',
  location_text   text,
  description     text                      NOT NULL DEFAULT '',
  compensation    text,
  apply_url       text,
  created_at      timestamptz               NOT NULL DEFAULT now(),
  updated_at      timestamptz               NOT NULL DEFAULT now()
);

CREATE INDEX idx_entity_job_offers_entity_id ON entity_job_offers (entity_id);

ALTER TABLE entity_job_offers ENABLE ROW LEVEL SECURITY;

-- Public can select published job offers
CREATE POLICY "entity_job_offers_public_select" ON entity_job_offers
  FOR SELECT TO anon, authenticated
  USING (status = 'published');

-- Owners can do anything
CREATE POLICY "entity_job_offers_owner_select" ON entity_job_offers
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM entity e WHERE e.id = entity_job_offers.entity_id AND e.user_id = auth.uid()
    )
  );

CREATE POLICY "entity_job_offers_owner_insert" ON entity_job_offers
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM entity e WHERE e.id = entity_job_offers.entity_id AND e.user_id = auth.uid()
    )
  );

CREATE POLICY "entity_job_offers_owner_update" ON entity_job_offers
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM entity e WHERE e.id = entity_job_offers.entity_id AND e.user_id = auth.uid()
    )
  );

CREATE POLICY "entity_job_offers_owner_delete" ON entity_job_offers
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM entity e WHERE e.id = entity_job_offers.entity_id AND e.user_id = auth.uid()
    )
  );
