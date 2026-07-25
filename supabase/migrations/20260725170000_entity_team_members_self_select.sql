-- Derive prod jamais migree : policy entity_team_members_self_select en plus
-- des policies owner -- permet a un membre d'equipe de voir sa propre ligne
-- de membership (son role, sans acces aux autres membres). Raisonnable et
-- deja actif en prod, jamais trace en migration.

DROP POLICY IF EXISTS "entity_team_members_self_select" ON public.entity_team_members;
CREATE POLICY "entity_team_members_self_select"
  ON public.entity_team_members FOR SELECT
  USING (user_id = auth.uid());
