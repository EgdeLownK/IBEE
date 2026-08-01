-- Preuve dans les deux sens que relaunch_job_offer() (SECURITY DEFINER,
-- 20260803100000_job_offer_relaunch_session_rpc.sql) revalide elle-meme le
-- droit d'agir plutot que de faire confiance a l'appelant :
--   a) un membre d'equipe AVEC la permission 'talent' peut l'appeler, et
--      session_count + archivage des candidatures sont TOUS DEUX effectues
--      (meme transaction).
--   b) [cas central] un membre d'equipe SANS cette permission est refuse
--      (RAISE EXCEPTION 'Forbidden', code P0001), et NI session_count NI
--      les candidatures ne bougent.
-- Ecrit pour echouer si le controle interne (entity_user_has_permission)
-- etait retire ou contourne - pas pour confirmer qu'il existe.
begin;
create extension if not exists pgtap with schema extensions;

select plan(8);

-- Fixtures (superuser, RLS bypassee).
insert into auth.users (id, email) values
  ('a1000000-0000-0000-0000-00000000000a', 'relaunch-owner-a@test.local'),
  ('c1000000-0000-0000-0000-000000000001', 'relaunch-team-a-talent@test.local'),
  ('c1000000-0000-0000-0000-000000000002', 'relaunch-team-a-notalent@test.local'),
  ('c1000000-0000-0000-0000-000000000003', 'relaunch-unrelated@test.local');

insert into public.entity (id, slug, display_name, user_id) values
  ('a1000000-0000-0000-0000-00000000000a', 'test-relaunch-entity-a', 'Entity Relaunch A', 'a1000000-0000-0000-0000-00000000000a');

insert into public.entity_team_roles (id, entity_id, role_key, label, bg, fg, permissions) values
  ('d1000000-0000-0000-0000-00000000000a', 'a1000000-0000-0000-0000-00000000000a', 'recruiter', 'Recruteur', '#000', '#fff', '{"talent": true}'::jsonb),
  ('d1000000-0000-0000-0000-00000000000b', 'a1000000-0000-0000-0000-00000000000a', 'support', 'Support', '#000', '#fff', '{"talent": false}'::jsonb);

insert into public.entity_team_members (id, entity_id, user_id, role_id, email) values
  ('e1000000-0000-0000-0000-00000000000a', 'a1000000-0000-0000-0000-00000000000a', 'c1000000-0000-0000-0000-000000000001', 'd1000000-0000-0000-0000-00000000000a', 'relaunch-team-a-talent@test.local'),
  ('e1000000-0000-0000-0000-00000000000b', 'a1000000-0000-0000-0000-00000000000a', 'c1000000-0000-0000-0000-000000000002', 'd1000000-0000-0000-0000-00000000000b', 'relaunch-team-a-notalent@test.local');

-- session_count part du DEFAULT (1). Deux candidatures actives a archiver.
insert into public.entity_job_offers (id, entity_id, title, contract_type, status) values
  ('f1000000-0000-0000-0000-00000000000a', 'a1000000-0000-0000-0000-00000000000a', 'Offre relance A', 'cdi', 'active');

insert into public.entity_job_applications (id, offer_id, first_name, last_name, email) values
  ('90000000-0000-0000-0000-00000000000a', 'f1000000-0000-0000-0000-00000000000a', 'Ada', 'Lovelace', 'ada@test.local'),
  ('90000000-0000-0000-0000-00000000000b', 'f1000000-0000-0000-0000-00000000000a', 'Alan', 'Turing', 'alan@test.local');

-- ============================================================
-- Cas (b) -- CENTRAL : equipe A, SANS la permission 'talent'.
-- Doit etre refuse ; ni session_count ni is_archived ne doivent bouger.
-- ============================================================
set local role authenticated;
set local request.jwt.claim.sub = 'c1000000-0000-0000-0000-000000000002';

select throws_ok(
  $$select relaunch_job_offer('f1000000-0000-0000-0000-00000000000a')$$,
  'P0001',
  'Forbidden',
  'équipe A (sans talent) : relaunch_job_offer refusé'
);

set local role postgres;

select results_eq(
  $$select session_count from public.entity_job_offers where id = 'f1000000-0000-0000-0000-00000000000a'$$,
  ARRAY[1],
  'équipe A (sans talent) refusée : session_count inchangé (toujours 1)'
);

select is(
  (select count(*)::int from public.entity_job_applications where offer_id = 'f1000000-0000-0000-0000-00000000000a' and is_archived = true),
  0,
  'équipe A (sans talent) refusée : aucune candidature archivée'
);

-- ============================================================
-- Cas (a) : equipe A, AVEC la permission 'talent'.
-- Doit reussir : session_count incremente ET candidatures archivees.
-- ============================================================
set local role authenticated;
set local request.jwt.claim.sub = 'c1000000-0000-0000-0000-000000000001';

select lives_ok(
  $$select relaunch_job_offer('f1000000-0000-0000-0000-00000000000a')$$,
  'équipe A (talent) : relaunch_job_offer réussit'
);

set local role postgres;

select results_eq(
  $$select session_count from public.entity_job_offers where id = 'f1000000-0000-0000-0000-00000000000a'$$,
  ARRAY[2],
  'équipe A (talent) : session_count incrémenté à 2'
);

select is(
  (select count(*)::int from public.entity_job_applications where offer_id = 'f1000000-0000-0000-0000-00000000000a' and is_archived = true),
  2,
  'équipe A (talent) : les 2 candidatures actives sont archivées'
);

-- ============================================================
-- Cas complementaire : utilisateur sans aucun lien avec l'entite (ni owner,
-- ni equipe) - meme controle interne, autre branche refusee par
-- entity_user_has_permission.
-- ============================================================
set local role authenticated;
set local request.jwt.claim.sub = 'c1000000-0000-0000-0000-000000000003';

select throws_ok(
  $$select relaunch_job_offer('f1000000-0000-0000-0000-00000000000a')$$,
  'P0001',
  'Forbidden',
  'utilisateur sans lien avec l''entité : relaunch_job_offer refusé'
);

set local role postgres;

select results_eq(
  $$select session_count from public.entity_job_offers where id = 'f1000000-0000-0000-0000-00000000000a'$$,
  ARRAY[2],
  'utilisateur sans lien : session_count toujours à 2 (pas de nouvel incrément)'
);

select * from finish();
rollback;
