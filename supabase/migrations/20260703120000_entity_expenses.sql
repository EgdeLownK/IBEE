-- =============================================================================
-- Dépenses du projet (Achats)
-- =============================================================================

CREATE TYPE entity_expense_status AS ENUM ('pending', 'completed', 'cancelled');

CREATE TABLE entity_expenses (
  id           uuid                  PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id    uuid                  NOT NULL REFERENCES entity(id) ON DELETE CASCADE,
  amount_cents integer               NOT NULL CHECK (amount_cents > 0),
  description  text                  NOT NULL,
  status       entity_expense_status NOT NULL DEFAULT 'completed',
  incurred_at  timestamptz           NOT NULL DEFAULT now(),
  created_at   timestamptz           NOT NULL DEFAULT now(),
  updated_at   timestamptz           NOT NULL DEFAULT now()
);

CREATE INDEX idx_entity_expenses_entity_id ON entity_expenses (entity_id);
CREATE INDEX idx_entity_expenses_incurred_at ON entity_expenses (incurred_at DESC);

ALTER TABLE entity_expenses ENABLE ROW LEVEL SECURITY;

-- Les propriétaires de l'entité peuvent lire/écrire
CREATE POLICY "entity_expenses_owner_select" ON entity_expenses
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM entity e WHERE e.id = entity_expenses.entity_id AND e.user_id = auth.uid()
    )
  );

CREATE POLICY "entity_expenses_owner_insert" ON entity_expenses
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM entity e WHERE e.id = entity_expenses.entity_id AND e.user_id = auth.uid()
    )
  );

CREATE POLICY "entity_expenses_owner_update" ON entity_expenses
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM entity e WHERE e.id = entity_expenses.entity_id AND e.user_id = auth.uid()
    )
  );

CREATE POLICY "entity_expenses_owner_delete" ON entity_expenses
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM entity e WHERE e.id = entity_expenses.entity_id AND e.user_id = auth.uid()
    )
  );
