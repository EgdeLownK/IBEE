-- Tests RLS pour `entity_job_offers` : table la plus fragile du domaine
-- talent — ses policies "team_*" reposent sur entity_user_has_permission(),
-- la fonction de permission la plus complexe du schéma (jointure
-- entity_team_members/entity_team_roles + lecture d'un JSONB de
-- permissions), jamais testée directement jusqu'ici. Aucune Server Action
-- ne double cette vérification côté application (talent-actions.ts prend
-- entityId depuis les arguments du client, sans auth.getUser()) : RLS est
-- l'unique ligne de défense.
--
-- Précédent qui justifie ce test : bookings_owner_select affirmait être
-- scopée owner dans sa migration et tournait en USING (true) en prod
-- (voir bookings_rls.test.sql). Ce fichier est écrit pour ÉCHOUER si
-- entity_user_has_permission() ou les policies qui l'utilisent laissent
-- passer un accès cross-entity, pas pour confirmer qu'elles existent.
--
-- 5 rôles testés sur SELECT/INSERT/UPDATE/DELETE :
--   1. anonyme
--   2. authentifié sans lien avec l'entité A
--   3. équipe de l'entité A, AVEC la permission 'talent' (accès attendu)
--   4. équipe de l'entité B, AVEC la permission 'talent' -- sur B -- qui
--      tente sur A (cas critique : entity_user_has_permission scope-t-elle
--      bien par entity_id, ou la permission fuit-elle vers toute entité ?)
--   5. équipe de l'entité A, SANS la permission 'talent' (cas dérivé : la
--      permission JSONB est-elle vraiment lue, ou l'appartenance à l'équipe
--      suffit-elle seule ?)
--
-- Note : entity_job_offers a aussi une policy "public_select" (status =
-- 'active', TO anon, authenticated) — indépendante du système de
-- permissions, elle donne à TOUS les rôles authentifiés (y compris les cas
-- 2/4/5 ci-dessus) une visibilité sur l'offre active de n'importe quelle
-- entité. Chaque assertion SELECT ci-dessous vérifie explicitement que
-- cette visibilité publique ne s'étend jamais à l'offre inactive (qui ne
-- doit être visible qu'aux rôles 3 et au propriétaire).
begin;
create extension if not exists pgtap with schema extensions;

select plan(20);

-- Fixtures (superuser, RLS bypassée).
insert into auth.users (id, email) values
  ('a0000000-0000-0000-0000-00000000000a', 'owner-a@test.local'),
  ('b0000000-0000-0000-0000-00000000000b', 'owner-b@test.local'),
  ('c0000000-0000-0000-0000-000000000003', 'team-a-talent@test.local'),
  ('c0000000-0000-0000-0000-000000000004', 'team-b-talent@test.local'),
  ('c0000000-0000-0000-0000-000000000005', 'unrelated@test.local'),
  ('c0000000-0000-0000-0000-000000000006', 'team-a-notalent@test.local');

insert into public.entity (id, slug, display_name, user_id) values
  ('a0000000-0000-0000-0000-00000000000a', 'test-joboffers-entity-a', 'Entity A', 'a0000000-0000-0000-0000-00000000000a'),
  ('b0000000-0000-0000-0000-00000000000b', 'test-joboffers-entity-b', 'Entity B', 'b0000000-0000-0000-0000-00000000000b');

-- Rôle "talent" sur A et sur B, plus un rôle sans la permission sur A.
insert into public.entity_team_roles (id, entity_id, role_key, label, bg, fg, permissions) values
  ('d0000000-0000-0000-0000-00000000000a', 'a0000000-0000-0000-0000-00000000000a', 'recruiter', 'Recruteur', '#000', '#fff', '{"talent": true}'::jsonb),
  ('d0000000-0000-0000-0000-00000000000b', 'b0000000-0000-0000-0000-00000000000b', 'recruiter', 'Recruteur', '#000', '#fff', '{"talent": true}'::jsonb),
  ('d0000000-0000-0000-0000-00000000000c', 'a0000000-0000-0000-0000-00000000000a', 'support', 'Support', '#000', '#fff', '{"talent": false}'::jsonb);

insert into public.entity_team_members (id, entity_id, user_id, role_id, email) values
  ('e0000000-0000-0000-0000-00000000000a', 'a0000000-0000-0000-0000-00000000000a', 'c0000000-0000-0000-0000-000000000003', 'd0000000-0000-0000-0000-00000000000a', 'team-a-talent@test.local'),
  ('e0000000-0000-0000-0000-00000000000b', 'b0000000-0000-0000-0000-00000000000b', 'c0000000-0000-0000-0000-000000000004', 'd0000000-0000-0000-0000-00000000000b', 'team-b-talent@test.local'),
  ('e0000000-0000-0000-0000-00000000000c', 'a0000000-0000-0000-0000-00000000000a', 'c0000000-0000-0000-0000-000000000006', 'd0000000-0000-0000-0000-00000000000c', 'team-a-notalent@test.local');

-- Une offre active (visible publiquement) et une inactive (visible seulement
-- par l'équipe habilitée) sur l'entity A.
insert into public.entity_job_offers (id, entity_id, title, contract_type, status) values
  ('f0000000-0000-0000-0000-00000000000a', 'a0000000-0000-0000-0000-00000000000a', 'Offre active A', 'cdi', 'active'),
  ('f0000000-0000-0000-0000-00000000000b', 'a0000000-0000-0000-0000-00000000000a', 'Offre inactive A', 'cdi', 'inactive');

-- ============================================================
-- Cas 1 : anonyme.
-- ============================================================
set local role anon;

select results_eq(
  $$select id from public.entity_job_offers where entity_id = 'a0000000-0000-0000-0000-00000000000a' order by id$$,
  ARRAY['f0000000-0000-0000-0000-00000000000a'::uuid],
  'anonyme : voit seulement l''offre active de A (public_select), jamais l''inactive'
);

select throws_ok(
  $$insert into public.entity_job_offers (entity_id, title, contract_type, status) values ('a0000000-0000-0000-0000-00000000000a', 'Hack', 'cdi', 'active')$$,
  '42501',
  'new row violates row-level security policy for table "entity_job_offers"',
  'anonyme : ne peut pas créer d''offre pour A'
);

select results_eq(
  $$update public.entity_job_offers set title = 'hack' where id = 'f0000000-0000-0000-0000-00000000000b' returning id$$,
  ARRAY[]::uuid[],
  'anonyme : ne peut pas modifier l''offre inactive de A (0 ligne affectée)'
);

select results_eq(
  $$delete from public.entity_job_offers where id = 'f0000000-0000-0000-0000-00000000000b' returning id$$,
  ARRAY[]::uuid[],
  'anonyme : ne peut pas supprimer l''offre inactive de A (0 ligne affectée)'
);

-- ============================================================
-- Cas 2 : authentifié sans lien avec l'entité A (ni owner, ni équipe).
-- ============================================================
set local role authenticated;
set local request.jwt.claim.sub = 'c0000000-0000-0000-0000-000000000005';

select results_eq(
  $$select id from public.entity_job_offers where entity_id = 'a0000000-0000-0000-0000-00000000000a' order by id$$,
  ARRAY['f0000000-0000-0000-0000-00000000000a'::uuid],
  'authentifié sans lien : voit seulement l''offre active de A, jamais l''inactive'
);

select throws_ok(
  $$insert into public.entity_job_offers (entity_id, title, contract_type, status) values ('a0000000-0000-0000-0000-00000000000a', 'Hack', 'cdi', 'active')$$,
  '42501',
  'new row violates row-level security policy for table "entity_job_offers"',
  'authentifié sans lien : ne peut pas créer d''offre pour A'
);

select results_eq(
  $$update public.entity_job_offers set title = 'hack' where id = 'f0000000-0000-0000-0000-00000000000b' returning id$$,
  ARRAY[]::uuid[],
  'authentifié sans lien : ne peut pas modifier l''offre inactive de A (0 ligne affectée)'
);

select results_eq(
  $$delete from public.entity_job_offers where id = 'f0000000-0000-0000-0000-00000000000a' returning id$$,
  ARRAY[]::uuid[],
  'authentifié sans lien : ne peut pas supprimer l''offre active de A (0 ligne affectée)'
);

-- ============================================================
-- Cas 3 : équipe de l'entité A, AVEC la permission 'talent' (accès attendu).
-- ============================================================
set local request.jwt.claim.sub = 'c0000000-0000-0000-0000-000000000003';

select results_eq(
  $$select id from public.entity_job_offers where entity_id = 'a0000000-0000-0000-0000-00000000000a' order by id$$,
  ARRAY['f0000000-0000-0000-0000-00000000000a'::uuid, 'f0000000-0000-0000-0000-00000000000b'::uuid],
  'équipe A (talent) : voit les 2 offres de A, y compris l''inactive'
);

select lives_ok(
  $$insert into public.entity_job_offers (id, entity_id, title, contract_type, status) values ('77700000-0000-0000-0000-000000000007', 'a0000000-0000-0000-0000-00000000000a', 'Offre créée par équipe A', 'mission', 'inactive')$$,
  'équipe A (talent) : peut créer une offre pour A'
);

select lives_ok(
  $$update public.entity_job_offers set title = 'Offre inactive A (éditée)' where id = 'f0000000-0000-0000-0000-00000000000b'$$,
  'équipe A (talent) : peut modifier une offre de A'
);

select lives_ok(
  $$delete from public.entity_job_offers where id = '77700000-0000-0000-0000-000000000007'$$,
  'équipe A (talent) : peut supprimer une offre de A'
);

-- ============================================================
-- Cas 4 (critique) : équipe de l'entité B, AVEC la permission 'talent' sur
-- B, tente sur A. entity_user_has_permission() doit scoper strictement par
-- entity_id -- une permission accordée sur B ne doit rien ouvrir sur A.
-- ============================================================
set local request.jwt.claim.sub = 'c0000000-0000-0000-0000-000000000004';

select results_eq(
  $$select id from public.entity_job_offers where entity_id = 'a0000000-0000-0000-0000-00000000000a' order by id$$,
  ARRAY['f0000000-0000-0000-0000-00000000000a'::uuid],
  'équipe B (talent sur B) : sur A, voit seulement l''offre active (aucune fuite de permission cross-entity), jamais l''inactive'
);

select throws_ok(
  $$insert into public.entity_job_offers (entity_id, title, contract_type, status) values ('a0000000-0000-0000-0000-00000000000a', 'Hack', 'cdi', 'active')$$,
  '42501',
  'new row violates row-level security policy for table "entity_job_offers"',
  'équipe B (talent sur B) : ne peut pas créer d''offre pour A'
);

select results_eq(
  $$update public.entity_job_offers set title = 'hack' where id = 'f0000000-0000-0000-0000-00000000000b' returning id$$,
  ARRAY[]::uuid[],
  'équipe B (talent sur B) : ne peut pas modifier l''offre inactive de A (0 ligne affectée)'
);

select results_eq(
  $$delete from public.entity_job_offers where id = 'f0000000-0000-0000-0000-00000000000b' returning id$$,
  ARRAY[]::uuid[],
  'équipe B (talent sur B) : ne peut pas supprimer l''offre inactive de A (0 ligne affectée)'
);

-- ============================================================
-- Cas 5 (dérivé) : équipe de l'entité A, SANS la permission 'talent'.
-- L'appartenance à l'équipe seule ne doit rien accorder -- la permission
-- JSONB doit vraiment être lue, pas seulement l'appartenance à entity_team_members.
-- ============================================================
set local request.jwt.claim.sub = 'c0000000-0000-0000-0000-000000000006';

select results_eq(
  $$select id from public.entity_job_offers where entity_id = 'a0000000-0000-0000-0000-00000000000a' order by id$$,
  ARRAY['f0000000-0000-0000-0000-00000000000a'::uuid],
  'équipe A (sans talent) : voit seulement l''offre active (appartenance à l''équipe insuffisante), jamais l''inactive'
);

select throws_ok(
  $$insert into public.entity_job_offers (entity_id, title, contract_type, status) values ('a0000000-0000-0000-0000-00000000000a', 'Hack', 'cdi', 'active')$$,
  '42501',
  'new row violates row-level security policy for table "entity_job_offers"',
  'équipe A (sans talent) : ne peut pas créer d''offre pour A'
);

select results_eq(
  $$update public.entity_job_offers set title = 'hack' where id = 'f0000000-0000-0000-0000-00000000000b' returning id$$,
  ARRAY[]::uuid[],
  'équipe A (sans talent) : ne peut pas modifier l''offre inactive de A (0 ligne affectée)'
);

select results_eq(
  $$delete from public.entity_job_offers where id = 'f0000000-0000-0000-0000-00000000000b' returning id$$,
  ARRAY[]::uuid[],
  'équipe A (sans talent) : ne peut pas supprimer l''offre inactive de A (0 ligne affectée)'
);

select * from finish();
rollback;
