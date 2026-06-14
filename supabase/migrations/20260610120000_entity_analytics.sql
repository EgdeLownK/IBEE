-- =============================================================================
-- Analytics events — first-party tracking for dashboard Analyse
-- =============================================================================

CREATE TYPE analytics_event_type AS ENUM (
  'profile_view',
  'section_view',
  'publication_view',
  'product_view',
  'service_view',
  'event_view',
  'booking_created',
  'follow',
  'unfollow',
  'wishlist_add',
  'publication_share'
);

CREATE TABLE entity_analytics_events (
  id            uuid                  PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id     uuid                  NOT NULL REFERENCES entity(id) ON DELETE CASCADE,
  event_type    analytics_event_type  NOT NULL,
  occurred_at   timestamptz           NOT NULL DEFAULT now(),
  visitor_key   text,
  section_type  menu_section_type,
  resource_id   uuid,
  metadata      jsonb                 NOT NULL DEFAULT '{}'::jsonb
);

COMMENT ON TABLE entity_analytics_events IS
  'Événements analytics first-party (vues, follows, etc.) pour le dashboard Analyse.';

CREATE INDEX idx_entity_analytics_events_entity_time
  ON entity_analytics_events (entity_id, event_type, occurred_at DESC);

CREATE INDEX idx_entity_analytics_events_entity_resource
  ON entity_analytics_events (entity_id, resource_id, occurred_at DESC)
  WHERE resource_id IS NOT NULL;

CREATE INDEX idx_entity_analytics_events_visitor
  ON entity_analytics_events (entity_id, visitor_key, event_type, occurred_at DESC)
  WHERE visitor_key IS NOT NULL;

-- =============================================================================
-- RLS
-- =============================================================================

ALTER TABLE entity_analytics_events ENABLE ROW LEVEL SECURITY;

-- Insertion publique (anon + auth) — l'entity doit exister
CREATE POLICY entity_analytics_events_public_insert
  ON entity_analytics_events
  FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM entity e WHERE e.id = entity_id)
  );

-- Lecture réservée au propriétaire de l'entity
CREATE POLICY entity_analytics_events_owner_select
  ON entity_analytics_events
  FOR SELECT
  USING (
    entity_id IN (SELECT id FROM entity WHERE user_id = auth.uid())
  );
