-- =============================================================================
-- Équipe — rôles, membres, invitations
-- =============================================================================

CREATE TYPE entity_team_invite_status AS ENUM ('pending', 'accepted', 'expired', 'cancelled');

CREATE TABLE entity_team_roles (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id   uuid        NOT NULL REFERENCES entity(id) ON DELETE CASCADE,
  role_key    text        NOT NULL,
  label       text        NOT NULL,
  bg          text        NOT NULL,
  fg          text        NOT NULL,
  permissions jsonb       NOT NULL DEFAULT '{}'::jsonb,
  locked      boolean     NOT NULL DEFAULT false,
  inviteable  boolean     NOT NULL DEFAULT true,
  position    smallint    NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT entity_team_roles_entity_role_key_unique UNIQUE (entity_id, role_key)
);

CREATE TABLE entity_team_members (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id     uuid        NOT NULL REFERENCES entity(id) ON DELETE CASCADE,
  user_id       uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role_id       uuid        NOT NULL REFERENCES entity_team_roles(id) ON DELETE RESTRICT,
  email         text        NOT NULL,
  display_name  text,
  joined_at     timestamptz NOT NULL DEFAULT now(),
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT entity_team_members_entity_user_unique UNIQUE (entity_id, user_id)
);

CREATE TABLE entity_team_invitations (
  id          uuid                      PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id   uuid                      NOT NULL REFERENCES entity(id) ON DELETE CASCADE,
  email       text                      NOT NULL,
  role_id     uuid                      NOT NULL REFERENCES entity_team_roles(id) ON DELETE RESTRICT,
  invited_by  uuid                      NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status      entity_team_invite_status NOT NULL DEFAULT 'pending',
  created_at  timestamptz               NOT NULL DEFAULT now(),
  updated_at  timestamptz               NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX entity_team_invitations_pending_email
  ON entity_team_invitations (entity_id, lower(email))
  WHERE status = 'pending';

CREATE INDEX idx_entity_team_roles_entity
  ON entity_team_roles (entity_id, position);

CREATE INDEX idx_entity_team_members_entity
  ON entity_team_members (entity_id);

CREATE INDEX idx_entity_team_invitations_entity_status
  ON entity_team_invitations (entity_id, status);

CREATE TRIGGER trg_entity_team_roles_updated_at
  BEFORE UPDATE ON entity_team_roles
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_entity_team_members_updated_at
  BEFORE UPDATE ON entity_team_members
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_entity_team_invitations_updated_at
  BEFORE UPDATE ON entity_team_invitations
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

-- =============================================================================
-- RLS — owner entity uniquement (v1)
-- =============================================================================

ALTER TABLE entity_team_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE entity_team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE entity_team_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY entity_team_roles_owner_select
  ON entity_team_roles FOR SELECT
  USING (EXISTS (SELECT 1 FROM entity e WHERE e.id = entity_id AND e.user_id = auth.uid()));

CREATE POLICY entity_team_roles_owner_insert
  ON entity_team_roles FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM entity e WHERE e.id = entity_id AND e.user_id = auth.uid()));

CREATE POLICY entity_team_roles_owner_update
  ON entity_team_roles FOR UPDATE
  USING (EXISTS (SELECT 1 FROM entity e WHERE e.id = entity_id AND e.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM entity e WHERE e.id = entity_id AND e.user_id = auth.uid()));

CREATE POLICY entity_team_roles_owner_delete
  ON entity_team_roles FOR DELETE
  USING (
    locked = false
    AND EXISTS (SELECT 1 FROM entity e WHERE e.id = entity_id AND e.user_id = auth.uid())
  );

CREATE POLICY entity_team_members_owner_select
  ON entity_team_members FOR SELECT
  USING (EXISTS (SELECT 1 FROM entity e WHERE e.id = entity_id AND e.user_id = auth.uid()));

CREATE POLICY entity_team_members_owner_insert
  ON entity_team_members FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM entity e WHERE e.id = entity_id AND e.user_id = auth.uid()));

CREATE POLICY entity_team_members_owner_update
  ON entity_team_members FOR UPDATE
  USING (EXISTS (SELECT 1 FROM entity e WHERE e.id = entity_id AND e.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM entity e WHERE e.id = entity_id AND e.user_id = auth.uid()));

CREATE POLICY entity_team_members_owner_delete
  ON entity_team_members FOR DELETE
  USING (EXISTS (SELECT 1 FROM entity e WHERE e.id = entity_id AND e.user_id = auth.uid()));

CREATE POLICY entity_team_invitations_owner_select
  ON entity_team_invitations FOR SELECT
  USING (EXISTS (SELECT 1 FROM entity e WHERE e.id = entity_id AND e.user_id = auth.uid()));

CREATE POLICY entity_team_invitations_owner_insert
  ON entity_team_invitations FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM entity e WHERE e.id = entity_id AND e.user_id = auth.uid()));

CREATE POLICY entity_team_invitations_owner_update
  ON entity_team_invitations FOR UPDATE
  USING (EXISTS (SELECT 1 FROM entity e WHERE e.id = entity_id AND e.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM entity e WHERE e.id = entity_id AND e.user_id = auth.uid()));

CREATE POLICY entity_team_invitations_owner_delete
  ON entity_team_invitations FOR DELETE
  USING (EXISTS (SELECT 1 FROM entity e WHERE e.id = entity_id AND e.user_id = auth.uid()));
