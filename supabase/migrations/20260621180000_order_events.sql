-- Journal des événements commande (fulfillment, étiquettes, suivi)

CREATE TYPE order_event_type AS ENUM (
  'order_created',
  'payment_confirmed',
  'fulfillment_changed',
  'tracking_updated',
  'label_printed',
  'note_updated'
);

CREATE TABLE order_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  entity_id uuid NOT NULL REFERENCES entity(id) ON DELETE CASCADE,
  event_type order_event_type NOT NULL,
  title text NOT NULL,
  detail text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  actor_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_order_events_order_created ON order_events (order_id, created_at DESC);
CREATE INDEX idx_order_events_entity ON order_events (entity_id, created_at DESC);

COMMENT ON TABLE order_events IS 'Historique opérationnel des commandes boutique (owner).';

ALTER TABLE order_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY order_events_owner_select
  ON order_events FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM entity e WHERE e.id = entity_id AND e.user_id = auth.uid())
  );

CREATE POLICY order_events_owner_insert
  ON order_events FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM entity e WHERE e.id = entity_id AND e.user_id = auth.uid())
  );
