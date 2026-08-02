-- Tests RLS pour `entity_job_offer_media` : table fille d'entity_job_offers,
-- policies basees sur entity_user_has_permission() (meme mecanisme que
-- entity_job_offers_team_*/entity_job_apps_team_*, 20260725100000). Fixtures
-- reprises d'entity_job_offers_rls.test.sql (5 roles : anonyme, authentifie
-- sans lien, equipe A avec permission talent, equipe B avec permission
-- talent -- sur B -- qui tente sur A, equipe A SANS la permission talent).
--
-- 4 operations testees par role (SELECT/INSERT/UPDATE/DELETE) sur le media
-- d'une offre ACTIVE (visible publiquement) et d'une offre INACTIVE
-- (visible seulement par l'equipe habilitee) de l'entite A -- meme structure
-- que le fichier de reference, pour prouver que la visibilite du media suit
-- exactement celle de l'offre parente, jamais plus large.
begin;
create extension if not exists pgtap with schema extensions;

select plan(20);

-- Fixtures (superuser, RLS bypassee).
insert into auth.users (id, email) values
  ('a0000000-0000-0000-0000-00000000000a', 'owner-a@test.local'),
  ('b0000000-0000-0000-0000-00000000000b', 'owner-b@test.local'),
  ('c0000000-0000-0000-0000-000000000003', 'team-a-talent@test.local'),
  ('c0000000-0000-0000-0000-000000000004', 'team-b-talent@test.local'),
  ('c0000000-0000-0000-0000-000000000005', 'unrelated@test.local'),
  ('c0000000-0000-0000-0000-000000000006', 'team-a-notalent@test.local');

insert into public.entity (id, slug, display_name, user_id) values
  ('a0000000-0000-0000-0000-00000000000a', 'test-jobmedia-entity-a', 'Entity A', 'a0000000-0000-0000-0000-00000000000a'),
  ('b0000000-0000-0000-0000-00000000000b', 'test-jobmedia-entity-b', 'Entity B', 'b0000000-0000-0000-0000-00000000000b');

-- Role "talent" sur A et sur B, plus un role sans la permission sur A.
insert into public.entity_team_roles (id, entity_id, role_key, label, bg, fg, permissions) values
  ('d0000000-0000-0000-0000-00000000000a', 'a0000000-0000-0000-0000-00000000000a', 'recruiter', 'Recruteur', '#000', '#fff', '{"talent": true}'::jsonb),
  ('d0000000-0000-0000-0000-00000000000b', 'b0000000-0000-0000-0000-00000000000b', 'recruiter', 'Recruteur', '#000', '#fff', '{"talent": true}'::jsonb),
  ('d0000000-0000-0000-0000-00000000000c', 'a0000000-0000-0000-0000-00000000000a', 'support', 'Support', '#000', '#fff', '{"talent": false}'::jsonb);

insert into public.entity_team_members (id, entity_id, user_id, role_id, email) values
  ('e0000000-0000-0000-0000-00000000000a', 'a0000000-0000-0000-0000-00000000000a', 'c0000000-0000-0000-0000-000000000003', 'd0000000-0000-0000-0000-00000000000a', 'team-a-talent@test.local'),
  ('e0000000-0000-0000-0000-00000000000b', 'b0000000-0000-0000-0000-00000000000b', 'c0000000-0000-0000-0000-000000000004', 'd0000000-0000-0000-0000-00000000000b', 'team-b-talent@test.local'),
  ('e0000000-0000-0000-0000-00000000000c', 'a0000000-0000-0000-0000-00000000000a', 'c0000000-0000-0000-0000-000000000006', 'd0000000-0000-0000-0000-00000000000c', 'team-a-notalent@test.local');

-- Une offre active et une inactive sur l'entity A, chacune avec un media.
insert into public.entity_job_offers (id, entity_id, title, contract_type, status) values
  ('f0000000-0000-0000-0000-00000000000a', 'a0000000-0000-0000-0000-00000000000a', 'Offre active A', 'cdi', 'active'),
  ('f0000000-0000-0000-0000-00000000000b', 'a0000000-0000-0000-0000-00000000000a', 'Offre inactive A', 'cdi', 'inactive');

insert into public.entity_job_offer_media (id, offer_id, url, media_type, display_order) values
  ('aa000000-0000-0000-0000-00000000000a', 'f0000000-0000-0000-0000-00000000000a', 'https://example.local/active.jpg', 'image', 0),
  ('aa000000-0000-0000-0000-00000000000b', 'f0000000-0000-0000-0000-00000000000b', 'https://example.local/inactive.jpg', 'image', 0);

-- ============================================================
-- Cas 1 : anonyme.
-- ============================================================
set local role anon;

select results_eq(
  $$select id from public.entity_job_offer_media order by id$$,
  ARRAY['aa000000-0000-0000-0000-00000000000a'::uuid],
  'anonyme : voit seulement le media de l''offre active de A, jamais celui de l''inactive'
);

select throws_ok(
  $$insert into public.entity_job_offer_media (offer_id, url, media_type) values ('f0000000-0000-0000-0000-00000000000a', 'https://example.local/hack.jpg', 'image')$$,
  '42501',
  'new row violates row-level security policy for table "entity_job_offer_media"',
  'anonyme : ne peut pas ajouter de media a une offre de A'
);

select results_eq(
  $$update public.entity_job_offer_media set alt_text = 'hack' where id = 'aa000000-0000-0000-0000-00000000000a' returning id$$,
  ARRAY[]::uuid[],
  'anonyme : ne peut pas modifier le media de l''offre active de A (0 ligne affectee)'
);

select results_eq(
  $$delete from public.entity_job_offer_media where id = 'aa000000-0000-0000-0000-00000000000a' returning id$$,
  ARRAY[]::uuid[],
  'anonyme : ne peut pas supprimer le media de l''offre active de A (0 ligne affectee)'
);

-- ============================================================
-- Cas 2 : authentifie sans lien avec l'entite A (ni owner, ni equipe).
-- ============================================================
set local role authenticated;
set local request.jwt.claim.sub = 'c0000000-0000-0000-0000-000000000005';

select results_eq(
  $$select id from public.entity_job_offer_media order by id$$,
  ARRAY['aa000000-0000-0000-0000-00000000000a'::uuid],
  'authentifie sans lien : voit seulement le media de l''offre active de A, jamais celui de l''inactive'
);

select throws_ok(
  $$insert into public.entity_job_offer_media (offer_id, url, media_type) values ('f0000000-0000-0000-0000-00000000000a', 'https://example.local/hack.jpg', 'image')$$,
  '42501',
  'new row violates row-level security policy for table "entity_job_offer_media"',
  'authentifie sans lien : ne peut pas ajouter de media a une offre de A'
);

select results_eq(
  $$update public.entity_job_offer_media set alt_text = 'hack' where id = 'aa000000-0000-0000-0000-00000000000a' returning id$$,
  ARRAY[]::uuid[],
  'authentifie sans lien : ne peut pas modifier le media de l''offre active de A (0 ligne affectee)'
);

select results_eq(
  $$delete from public.entity_job_offer_media where id = 'aa000000-0000-0000-0000-00000000000a' returning id$$,
  ARRAY[]::uuid[],
  'authentifie sans lien : ne peut pas supprimer le media de l''offre active de A (0 ligne affectee)'
);

-- ============================================================
-- Cas 3 : equipe de l'entite A, AVEC la permission 'talent' (acces attendu).
-- ============================================================
set local request.jwt.claim.sub = 'c0000000-0000-0000-0000-000000000003';

select results_eq(
  $$select id from public.entity_job_offer_media order by id$$,
  ARRAY['aa000000-0000-0000-0000-00000000000a'::uuid, 'aa000000-0000-0000-0000-00000000000b'::uuid],
  'equipe A (talent) : voit les medias des 2 offres de A, y compris celui de l''inactive'
);

select lives_ok(
  $$insert into public.entity_job_offer_media (id, offer_id, url, media_type) values ('99900000-0000-0000-0000-000000000009', 'f0000000-0000-0000-0000-00000000000b', 'https://example.local/new.jpg', 'image')$$,
  'equipe A (talent) : peut ajouter un media a une offre de A'
);

select lives_ok(
  $$update public.entity_job_offer_media set alt_text = 'edite par equipe A' where id = 'aa000000-0000-0000-0000-00000000000b'$$,
  'equipe A (talent) : peut modifier un media d''une offre de A'
);

select lives_ok(
  $$delete from public.entity_job_offer_media where id = '99900000-0000-0000-0000-000000000009'$$,
  'equipe A (talent) : peut supprimer un media d''une offre de A'
);

-- ============================================================
-- Cas 4 (critique) : equipe de l'entite B, AVEC la permission 'talent' sur
-- B, tente sur A. entity_user_has_permission() doit scoper strictement par
-- entity_id -- une permission accordee sur B ne doit rien ouvrir sur A.
-- ============================================================
set local request.jwt.claim.sub = 'c0000000-0000-0000-0000-000000000004';

select results_eq(
  $$select id from public.entity_job_offer_media order by id$$,
  ARRAY['aa000000-0000-0000-0000-00000000000a'::uuid],
  'equipe B (talent sur B) : sur A, voit seulement le media de l''offre active (aucune fuite cross-entity), jamais celui de l''inactive'
);

select throws_ok(
  $$insert into public.entity_job_offer_media (offer_id, url, media_type) values ('f0000000-0000-0000-0000-00000000000a', 'https://example.local/hack.jpg', 'image')$$,
  '42501',
  'new row violates row-level security policy for table "entity_job_offer_media"',
  'equipe B (talent sur B) : ne peut pas ajouter de media a une offre de A'
);

select results_eq(
  $$update public.entity_job_offer_media set alt_text = 'hack' where id = 'aa000000-0000-0000-0000-00000000000b' returning id$$,
  ARRAY[]::uuid[],
  'equipe B (talent sur B) : ne peut pas modifier le media de l''offre inactive de A (0 ligne affectee)'
);

select results_eq(
  $$delete from public.entity_job_offer_media where id = 'aa000000-0000-0000-0000-00000000000b' returning id$$,
  ARRAY[]::uuid[],
  'equipe B (talent sur B) : ne peut pas supprimer le media de l''offre inactive de A (0 ligne affectee)'
);

-- ============================================================
-- Cas 5 (derive) : equipe de l'entite A, SANS la permission 'talent'.
-- L'appartenance a l'equipe seule ne doit rien accorder.
-- ============================================================
set local request.jwt.claim.sub = 'c0000000-0000-0000-0000-000000000006';

select results_eq(
  $$select id from public.entity_job_offer_media order by id$$,
  ARRAY['aa000000-0000-0000-0000-00000000000a'::uuid],
  'equipe A (sans talent) : voit seulement le media de l''offre active (appartenance a l''equipe insuffisante), jamais celui de l''inactive'
);

select throws_ok(
  $$insert into public.entity_job_offer_media (offer_id, url, media_type) values ('f0000000-0000-0000-0000-00000000000a', 'https://example.local/hack.jpg', 'image')$$,
  '42501',
  'new row violates row-level security policy for table "entity_job_offer_media"',
  'equipe A (sans talent) : ne peut pas ajouter de media a une offre de A'
);

select results_eq(
  $$update public.entity_job_offer_media set alt_text = 'hack' where id = 'aa000000-0000-0000-0000-00000000000b' returning id$$,
  ARRAY[]::uuid[],
  'equipe A (sans talent) : ne peut pas modifier le media de l''offre inactive de A (0 ligne affectee)'
);

select results_eq(
  $$delete from public.entity_job_offer_media where id = 'aa000000-0000-0000-0000-00000000000b' returning id$$,
  ARRAY[]::uuid[],
  'equipe A (sans talent) : ne peut pas supprimer le media de l''offre inactive de A (0 ligne affectee)'
);

select * from finish();
rollback;
