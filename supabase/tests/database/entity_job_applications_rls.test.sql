-- Tests RLS pour `entity_job_applications` (candidatures) : le domaine le plus
-- complexe des 5 audités — policies basées sur entity_user_has_permission(),
-- qui joint entity_team_members/entity_team_roles et vérifie un JSONB de
-- permissions. 4 cas testés : candidat, équipe de l'entity concernée, équipe
-- d'une AUTRE entity (le plus susceptible de fuiter vu la complexité des
-- sous-requêtes), anonyme.
begin;
create extension if not exists pgtap with schema extensions;

select plan(12);

-- Fixtures (superuser, RLS bypassée).
insert into auth.users (id, email) values
  ('a0000000-0000-0000-0000-00000000000a', 'owner-a@test.local'),
  ('b0000000-0000-0000-0000-00000000000b', 'owner-b@test.local'),
  ('c0000000-0000-0000-0000-000000000003', 'team-a@test.local'),
  ('c0000000-0000-0000-0000-000000000004', 'team-b@test.local'),
  ('c0000000-0000-0000-0000-000000000005', 'candidate-x@test.local'),
  ('c0000000-0000-0000-0000-000000000006', 'candidate-y@test.local');

insert into public.entity (id, slug, display_name, user_id) values
  ('a0000000-0000-0000-0000-00000000000a', 'test-jobs-entity-a', 'Entity A', 'a0000000-0000-0000-0000-00000000000a'),
  ('b0000000-0000-0000-0000-00000000000b', 'test-jobs-entity-b', 'Entity B', 'b0000000-0000-0000-0000-00000000000b');

-- Rôle "talent" pour chaque entity, et un membre d'équipe associé.
insert into public.entity_team_roles (id, entity_id, role_key, label, bg, fg, permissions) values
  ('d0000000-0000-0000-0000-00000000000a', 'a0000000-0000-0000-0000-00000000000a', 'recruiter', 'Recruteur', '#000', '#fff', '{"talent": true}'::jsonb),
  ('d0000000-0000-0000-0000-00000000000b', 'b0000000-0000-0000-0000-00000000000b', 'recruiter', 'Recruteur', '#000', '#fff', '{"talent": true}'::jsonb);

insert into public.entity_team_members (id, entity_id, user_id, role_id, email) values
  ('e0000000-0000-0000-0000-00000000000a', 'a0000000-0000-0000-0000-00000000000a', 'c0000000-0000-0000-0000-000000000003', 'd0000000-0000-0000-0000-00000000000a', 'team-a@test.local'),
  ('e0000000-0000-0000-0000-00000000000b', 'b0000000-0000-0000-0000-00000000000b', 'c0000000-0000-0000-0000-000000000004', 'd0000000-0000-0000-0000-00000000000b', 'team-b@test.local');

-- Offre active sur entity A (candidature publique autorisée) + une inactive (refusée).
insert into public.entity_job_offers (id, entity_id, title, contract_type, status) values
  ('f0000000-0000-0000-0000-00000000000a', 'a0000000-0000-0000-0000-00000000000a', 'Offre active', 'cdi', 'active'),
  ('f0000000-0000-0000-0000-00000000000b', 'a0000000-0000-0000-0000-00000000000a', 'Offre inactive', 'cdi', 'inactive');

insert into public.entity_job_applications (id, offer_id, first_name, last_name, email, applicant_user_id) values
  ('11100000-0000-0000-0000-000000000001', 'f0000000-0000-0000-0000-00000000000a', 'X', 'Candidate', 'x@test.local', 'c0000000-0000-0000-0000-000000000005'),
  ('22200000-0000-0000-0000-000000000002', 'f0000000-0000-0000-0000-00000000000a', 'Y', 'Candidate', 'y@test.local', 'c0000000-0000-0000-0000-000000000006');

-- Cas 1 : anonyme.
set local role anon;

select results_eq(
  $$select count(*) from public.entity_job_applications$$,
  ARRAY[0::bigint],
  'anonyme : ne lit aucune candidature (aucune policy SELECT pour anon)'
);

select lives_ok(
  $$insert into public.entity_job_applications (offer_id, first_name, last_name, email) values ('f0000000-0000-0000-0000-00000000000a', 'Anon', 'App', 'anon@test.local')$$,
  'anonyme : peut candidater sur une offre active (candidature publique)'
);

select throws_ok(
  $$insert into public.entity_job_applications (offer_id, first_name, last_name, email) values ('f0000000-0000-0000-0000-00000000000b', 'Anon', 'App2', 'anon2@test.local')$$,
  '42501',
  'new row violates row-level security policy for table "entity_job_applications"',
  'anonyme : ne peut pas candidater sur une offre inactive'
);

-- Cas 2 : candidat (X).
set local role authenticated;
set local request.jwt.claim.sub = 'c0000000-0000-0000-0000-000000000005';

select results_eq(
  $$select id from public.entity_job_applications order by id$$,
  ARRAY['11100000-0000-0000-0000-000000000001'::uuid],
  'candidat (X) : ne voit que sa propre candidature, jamais celle de Y'
);

select results_eq(
  $$update public.entity_job_applications set message = 'edit' where id = '11100000-0000-0000-0000-000000000001' returning id$$,
  ARRAY[]::uuid[],
  'candidat (X) : ne peut pas modifier sa propre candidature (aucune policy UPDATE pour le candidat)'
);

-- Cas 2bis : candidat (Y) — symétrie.
set local request.jwt.claim.sub = 'c0000000-0000-0000-0000-000000000006';

select results_eq(
  $$select id from public.entity_job_applications order by id$$,
  ARRAY['22200000-0000-0000-0000-000000000002'::uuid],
  'candidat (Y) : ne voit que sa propre candidature, jamais celle de X'
);

-- Cas 3 : équipe de l'entity concernée (team A, permission talent sur A).
set local request.jwt.claim.sub = 'c0000000-0000-0000-0000-000000000003';

select results_eq(
  $$select id from public.entity_job_applications order by id$$,
  ARRAY['11100000-0000-0000-0000-000000000001'::uuid, '22200000-0000-0000-0000-000000000002'::uuid],
  'équipe (A) : voit toutes les candidatures des offres de son entity'
);

select lives_ok(
  $$update public.entity_job_applications set status = 'shortlisted' where id = '11100000-0000-0000-0000-000000000001'$$,
  'équipe (A) : peut modifier une candidature de son entity'
);

-- Cas 4 (critique) : équipe d'une AUTRE entity (team B, permission talent sur B
-- uniquement) tente sur les candidatures de l'entity A.
set local request.jwt.claim.sub = 'c0000000-0000-0000-0000-000000000004';

select results_eq(
  $$select id from public.entity_job_applications$$,
  ARRAY[]::uuid[],
  'équipe (B, autre entity) : ne voit aucune candidature de l''entity A malgré la permission talent (scoping entity_id)'
);

select results_eq(
  $$update public.entity_job_applications set status = 'shortlisted' where id = '22200000-0000-0000-0000-000000000002' returning id$$,
  ARRAY[]::uuid[],
  'équipe (B, autre entity) : ne peut pas modifier une candidature de l''entity A (0 ligne affectée)'
);

select results_eq(
  $$delete from public.entity_job_applications where id = '22200000-0000-0000-0000-000000000002' returning id$$,
  ARRAY[]::uuid[],
  'équipe (B, autre entity) : ne peut pas supprimer une candidature de l''entity A (0 ligne affectée)'
);

-- Cleanup en tant qu'équipe A (prouve aussi que team_delete fonctionne toujours).
set local request.jwt.claim.sub = 'c0000000-0000-0000-0000-000000000003';

select lives_ok(
  $$delete from public.entity_job_applications where id = '22200000-0000-0000-0000-000000000002'$$,
  'équipe (A) : peut supprimer une candidature de son entity'
);

select * from finish();
rollback;
