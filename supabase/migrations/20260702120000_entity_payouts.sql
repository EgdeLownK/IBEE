-- =============================================================================
-- Virements équipe — règles récurrentes + transferts planifiés
-- =============================================================================

CREATE TYPE entity_payout_recurrence AS ENUM ('weekly', 'monthly', 'quarterly');
CREATE TYPE entity_payout_amount_type AS ENUM ('fixed', 'percent');
CREATE TYPE entity_payout_recipient_type AS ENUM ('owner', 'member');
CREATE TYPE entity_payout_transfer_status AS ENUM ('pending', 'exported', 'completed', 'cancelled');

CREATE TABLE entity_payout_schedules (
  id           uuid                      PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id    uuid                      NOT NULL REFERENCES entity(id) ON DELETE CASCADE,
  recurrence   entity_payout_recurrence  NOT NULL,
  is_active    boolean                   NOT NULL DEFAULT true,
  next_run_at  timestamptz               NOT NULL,
  last_run_at  timestamptz,
  created_at   timestamptz               NOT NULL DEFAULT now(),
  updated_at   timestamptz               NOT NULL DEFAULT now(),
  CONSTRAINT entity_payout_schedules_entity_unique UNIQUE (entity_id)
);

CREATE TABLE entity_payout_allocations (
  id              uuid                        PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id     uuid                        NOT NULL REFERENCES entity_payout_schedules(id) ON DELETE CASCADE,
  entity_id       uuid                        NOT NULL REFERENCES entity(id) ON DELETE CASCADE,
  recipient_type  entity_payout_recipient_type NOT NULL,
  member_id       uuid                        REFERENCES entity_team_members(id) ON DELETE CASCADE,
  amount_type     entity_payout_amount_type   NOT NULL,
  amount_value    integer                     NOT NULL CHECK (amount_value > 0),
  created_at      timestamptz                 NOT NULL DEFAULT now(),
  updated_at      timestamptz                 NOT NULL DEFAULT now(),
  CONSTRAINT entity_payout_allocations_member_required
    CHECK (
      (recipient_type = 'owner' AND member_id IS NULL)
      OR (recipient_type = 'member' AND member_id IS NOT NULL)
    ),
  CONSTRAINT entity_payout_allocations_percent_cap
    CHECK (amount_type <> 'percent' OR amount_value <= 10000),
  CONSTRAINT entity_payout_allocations_recipient_unique
    UNIQUE (schedule_id, recipient_type, member_id)
);

CREATE TABLE entity_payout_transfers (
  id                   uuid                           PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id            uuid                           NOT NULL REFERENCES entity(id) ON DELETE CASCADE,
  schedule_id          uuid                           NOT NULL REFERENCES entity_payout_schedules(id) ON DELETE CASCADE,
  allocation_id        uuid                           REFERENCES entity_payout_allocations(id) ON DELETE SET NULL,
  recipient_type       entity_payout_recipient_type   NOT NULL,
  member_id            uuid                           REFERENCES entity_team_members(id) ON DELETE SET NULL,
  recipient_name       text                           NOT NULL,
  recipient_email      text                           NOT NULL,
  period_start         timestamptz                    NOT NULL,
  period_end           timestamptz                    NOT NULL,
  revenue_basis_cents  integer                        NOT NULL DEFAULT 0,
  amount_cents         integer                        NOT NULL CHECK (amount_cents >= 0),
  status               entity_payout_transfer_status  NOT NULL DEFAULT 'pending',
  scheduled_at         timestamptz                    NOT NULL,
  exported_at          timestamptz,
  completed_at         timestamptz,
  created_at           timestamptz                    NOT NULL DEFAULT now(),
  updated_at           timestamptz                    NOT NULL DEFAULT now()
);

CREATE INDEX idx_entity_payout_schedules_next_run
  ON entity_payout_schedules (next_run_at)
  WHERE is_active = true;

CREATE INDEX idx_entity_payout_transfers_entity_status
  ON entity_payout_transfers (entity_id, status, scheduled_at DESC);

CREATE INDEX idx_entity_payout_allocations_schedule
  ON entity_payout_allocations (schedule_id);

CREATE TRIGGER trg_entity_payout_schedules_updated_at
  BEFORE UPDATE ON entity_payout_schedules
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_entity_payout_allocations_updated_at
  BEFORE UPDATE ON entity_payout_allocations
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_entity_payout_transfers_updated_at
  BEFORE UPDATE ON entity_payout_transfers
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

-- =============================================================================
-- RLS — owner entity uniquement (v1)
-- =============================================================================

ALTER TABLE entity_payout_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE entity_payout_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE entity_payout_transfers ENABLE ROW LEVEL SECURITY;

CREATE POLICY entity_payout_schedules_owner_select
  ON entity_payout_schedules FOR SELECT
  USING (EXISTS (SELECT 1 FROM entity e WHERE e.id = entity_id AND e.user_id = auth.uid()));

CREATE POLICY entity_payout_schedules_owner_insert
  ON entity_payout_schedules FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM entity e WHERE e.id = entity_id AND e.user_id = auth.uid()));

CREATE POLICY entity_payout_schedules_owner_update
  ON entity_payout_schedules FOR UPDATE
  USING (EXISTS (SELECT 1 FROM entity e WHERE e.id = entity_id AND e.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM entity e WHERE e.id = entity_id AND e.user_id = auth.uid()));

CREATE POLICY entity_payout_schedules_owner_delete
  ON entity_payout_schedules FOR DELETE
  USING (EXISTS (SELECT 1 FROM entity e WHERE e.id = entity_id AND e.user_id = auth.uid()));

CREATE POLICY entity_payout_allocations_owner_select
  ON entity_payout_allocations FOR SELECT
  USING (EXISTS (SELECT 1 FROM entity e WHERE e.id = entity_id AND e.user_id = auth.uid()));

CREATE POLICY entity_payout_allocations_owner_insert
  ON entity_payout_allocations FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM entity e WHERE e.id = entity_id AND e.user_id = auth.uid()));

CREATE POLICY entity_payout_allocations_owner_update
  ON entity_payout_allocations FOR UPDATE
  USING (EXISTS (SELECT 1 FROM entity e WHERE e.id = entity_id AND e.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM entity e WHERE e.id = entity_id AND e.user_id = auth.uid()));

CREATE POLICY entity_payout_allocations_owner_delete
  ON entity_payout_allocations FOR DELETE
  USING (EXISTS (SELECT 1 FROM entity e WHERE e.id = entity_id AND e.user_id = auth.uid()));

CREATE POLICY entity_payout_transfers_owner_select
  ON entity_payout_transfers FOR SELECT
  USING (EXISTS (SELECT 1 FROM entity e WHERE e.id = entity_id AND e.user_id = auth.uid()));

CREATE POLICY entity_payout_transfers_owner_insert
  ON entity_payout_transfers FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM entity e WHERE e.id = entity_id AND e.user_id = auth.uid()));

CREATE POLICY entity_payout_transfers_owner_update
  ON entity_payout_transfers FOR UPDATE
  USING (EXISTS (SELECT 1 FROM entity e WHERE e.id = entity_id AND e.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM entity e WHERE e.id = entity_id AND e.user_id = auth.uid()));

CREATE POLICY entity_payout_transfers_owner_delete
  ON entity_payout_transfers FOR DELETE
  USING (EXISTS (SELECT 1 FROM entity e WHERE e.id = entity_id AND e.user_id = auth.uid()));
