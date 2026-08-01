-- Rend atomiques l'incrementation de session_count et l'archivage des
-- candidatures actives lors d'une remise en ligne d'offre (aujourd'hui deux
-- appels .from().update() distincts dans updateJobOfferAction,
-- apps/platform/src/app/dashboard/talent/talent-actions.ts, sans lien
-- transactionnel entre eux). supabase-js/PostgREST ne permet aucune
-- transaction multi-requetes cote client : la seule garantie tout-ou-rien
-- est une fonction Postgres qui execute les deux ecritures dans une seule
-- transaction serveur.
--
-- SECURITY DEFINER contourne le RLS des tables qu'elle touche : la fonction
-- DOIT donc revalider elle-meme le droit d'agir, sans faire confiance a
-- l'appelant (meme motif que ban_entity_client/unban_entity_client,
-- 20260618140000_booking_phase4.sql / 20260622120000_clients_banned.sql).
-- entity_id n'est jamais recu en parametre : il est relu depuis
-- entity_job_offers a partir du seul p_offer_id, pour ne pas laisser
-- l'appelant choisir l'entite sur laquelle le controle porte.
--
-- Reutilise entity_user_has_permission(entity_id, 'talent')
-- (20260725100000_entity_job_team_permission_policies.sql), la fonction de
-- permission deja en place pour les policies "team_*" de entity_job_offers/
-- entity_job_applications (couvre owner + membre d'equipe avec la
-- permission 'talent', scopee par entity_id).
--
-- Perimetre volontairement etroit : la fonction ne touche que l'offre
-- p_offer_id et ses propres candidatures (offer_id = p_offer_id) - jamais
-- une autre table, jamais une autre offre.

CREATE OR REPLACE FUNCTION public.relaunch_job_offer(p_offer_id uuid)
RETURNS entity_job_offers
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_entity_id uuid;
  v_offer entity_job_offers;
BEGIN
  SELECT entity_id INTO v_entity_id
  FROM entity_job_offers
  WHERE id = p_offer_id;

  IF v_entity_id IS NULL THEN
    RAISE EXCEPTION 'Offre introuvable';
  END IF;

  -- Controle interne obligatoire : SECURITY DEFINER s'execute avec les
  -- droits du proprietaire de la fonction et ignore les policies RLS
  -- "team_*" qui protegent normalement ces deux tables. Sans cette ligne,
  -- n'importe quel utilisateur authentifie pourrait archiver les
  -- candidatures et faire avancer le compteur de session de n'importe
  -- quelle offre.
  IF NOT entity_user_has_permission(v_entity_id, 'talent') THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  UPDATE entity_job_applications
  SET is_archived = true
  WHERE offer_id = p_offer_id
    AND is_archived = false;

  UPDATE entity_job_offers
  SET session_count = session_count + 1
  WHERE id = p_offer_id
  RETURNING * INTO v_offer;

  RETURN v_offer;
END;
$$;

-- Pas de GRANT a anon : la remise en ligne est une action du studio owner,
-- toujours authentifie (requireTalentPermission dans talent-actions.ts en
-- amont cote application ; le controle ci-dessus en est la doublure cote
-- base, seule ligne de defense reelle puisque SECURITY DEFINER contourne le
-- RLS).
GRANT EXECUTE ON FUNCTION public.relaunch_job_offer(uuid) TO authenticated;

NOTIFY pgrst, 'reload schema';
