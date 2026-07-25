-- Reconstitue en migration une derive prod jamais tracee : la fonction
-- entity_user_has_permission() et les policies "team" qui l'utilisent sur
-- entity_job_offers / entity_job_applications ont ete creees directement en
-- prod (probablement peu apres la migration 20260703130000/20260703150000),
-- sans passer par une migration. Aucune des deux n'existait dans
-- supabase/migrations/ : recreees depuis prod via pg_get_functiondef /
-- pg_policies (meme classe de derive que update_updated_at() du 24/07,
-- voir _BRAIN-STATE.md §Dette).
--
-- Les policies "owner_*" d'origine (20260703130000 pour entity_job_offers,
-- 20260703150000 pour entity_job_applications) ont ete remplacees en prod par
-- ces policies "team_*" : entity_user_has_permission() couvre a la fois le
-- proprietaire (premiere branche EXISTS sur entity.user_id) et les membres
-- d'equipe ayant la permission 'talent' (seconde branche, scopee par
-- entity_id). Les DROP POLICY ci-dessous ne font qu'aligner les migrations
-- sur l'etat reel de prod, sans changement de comportement.

CREATE OR REPLACE FUNCTION public.entity_user_has_permission(p_entity_id uuid, p_permission text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM entity e
    WHERE e.id = p_entity_id AND e.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1
    FROM entity_team_members m
    JOIN entity_team_roles r ON r.id = m.role_id
    WHERE m.entity_id = p_entity_id
      AND m.user_id = auth.uid()
      AND (r.permissions ->> p_permission)::boolean IS TRUE
  );
$function$;

-- entity_job_offers : owner_select/insert/update/delete -> team_select/insert/update/delete
DROP POLICY IF EXISTS "entity_job_offers_owner_select" ON public.entity_job_offers;
DROP POLICY IF EXISTS "entity_job_offers_owner_insert" ON public.entity_job_offers;
DROP POLICY IF EXISTS "entity_job_offers_owner_update" ON public.entity_job_offers;
DROP POLICY IF EXISTS "entity_job_offers_owner_delete" ON public.entity_job_offers;

-- Deja presentes en prod (creees manuellement) : DROP IF EXISTS pour rendre
-- la migration idempotente, que ce soit rejoue depuis zero (CI) ou applique
-- sur une prod qui les a deja.
DROP POLICY IF EXISTS "entity_job_offers_team_select" ON public.entity_job_offers;
DROP POLICY IF EXISTS "entity_job_offers_team_insert" ON public.entity_job_offers;
DROP POLICY IF EXISTS "entity_job_offers_team_update" ON public.entity_job_offers;
DROP POLICY IF EXISTS "entity_job_offers_team_delete" ON public.entity_job_offers;

CREATE POLICY "entity_job_offers_team_select" ON public.entity_job_offers
  FOR SELECT TO authenticated
  USING (entity_user_has_permission(entity_id, 'talent'));

CREATE POLICY "entity_job_offers_team_insert" ON public.entity_job_offers
  FOR INSERT TO authenticated
  WITH CHECK (entity_user_has_permission(entity_id, 'talent'));

CREATE POLICY "entity_job_offers_team_update" ON public.entity_job_offers
  FOR UPDATE TO authenticated
  USING (entity_user_has_permission(entity_id, 'talent'))
  WITH CHECK (entity_user_has_permission(entity_id, 'talent'));

CREATE POLICY "entity_job_offers_team_delete" ON public.entity_job_offers
  FOR DELETE TO authenticated
  USING (entity_user_has_permission(entity_id, 'talent'));

-- entity_job_applications : owner_select/update/delete -> team_select/update/delete
DROP POLICY IF EXISTS "entity_job_apps_owner_select" ON public.entity_job_applications;
DROP POLICY IF EXISTS "entity_job_apps_owner_update" ON public.entity_job_applications;
DROP POLICY IF EXISTS "entity_job_apps_owner_delete" ON public.entity_job_applications;

DROP POLICY IF EXISTS "entity_job_apps_team_select" ON public.entity_job_applications;
DROP POLICY IF EXISTS "entity_job_apps_team_update" ON public.entity_job_applications;
DROP POLICY IF EXISTS "entity_job_apps_team_delete" ON public.entity_job_applications;

CREATE POLICY "entity_job_apps_team_select" ON public.entity_job_applications
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM entity_job_offers o
      WHERE o.id = entity_job_applications.offer_id
        AND entity_user_has_permission(o.entity_id, 'talent')
    )
  );

CREATE POLICY "entity_job_apps_team_update" ON public.entity_job_applications
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM entity_job_offers o
      WHERE o.id = entity_job_applications.offer_id
        AND entity_user_has_permission(o.entity_id, 'talent')
    )
  );

CREATE POLICY "entity_job_apps_team_delete" ON public.entity_job_applications
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM entity_job_offers o
      WHERE o.id = entity_job_applications.offer_id
        AND entity_user_has_permission(o.entity_id, 'talent')
    )
  );

NOTIFY pgrst, 'reload schema';
