-- Preuve dans les deux sens pour job_skills / entity_job_offer_skills /
-- user_skills (20260812130000_job_skills.sql) :
--   a) un authentifie PEUT creer une aptitude et l'attacher a SON offre.
--   b) il NE PEUT PAS modifier ni supprimer une aptitude existante, ni
--      attacher une aptitude a l'offre d'une AUTRE entite.
--   c) un visiteur ANONYME PEUT LIRE le referentiel.
-- + preuve de la normalisation (accents/casse/espaces) et de l'unicite sur
-- normalized_label, + own-only pour user_skills (pas de notion d'equipe
-- cote candidat).
--
-- Fixtures reprises d'entity_job_offer_media_rls.test.sql (5 roles : owner
-- A/B, equipe A talent, equipe B talent, non lie, equipe A sans talent) --
-- + 2 candidats pour user_skills.
begin;
create extension if not exists pgtap with schema extensions;

select plan(31);

-- ============================================================
-- Fixtures (superuser, RLS bypassee).
-- ============================================================
insert into auth.users (id, email) values
  ('a0000000-0000-0000-0000-00000000000a', 'owner-a@test.local'),
  ('b0000000-0000-0000-0000-00000000000b', 'owner-b@test.local'),
  ('c0000000-0000-0000-0000-000000000003', 'team-a-talent@test.local'),
  ('c0000000-0000-0000-0000-000000000004', 'team-b-talent@test.local'),
  ('c0000000-0000-0000-0000-000000000005', 'unrelated@test.local'),
  ('c0000000-0000-0000-0000-000000000006', 'team-a-notalent@test.local'),
  ('c0000000-0000-0000-0000-000000000007', 'candidate-x@test.local'),
  ('c0000000-0000-0000-0000-000000000008', 'candidate-y@test.local');

insert into public.entity (id, slug, display_name, user_id) values
  ('a0000000-0000-0000-0000-00000000000a', 'test-jobskills-entity-a', 'Entity A', 'a0000000-0000-0000-0000-00000000000a'),
  ('b0000000-0000-0000-0000-00000000000b', 'test-jobskills-entity-b', 'Entity B', 'b0000000-0000-0000-0000-00000000000b');

insert into public.entity_team_roles (id, entity_id, role_key, label, bg, fg, permissions) values
  ('d0000000-0000-0000-0000-00000000000a', 'a0000000-0000-0000-0000-00000000000a', 'recruiter', 'Recruteur', '#000', '#fff', '{"talent": true}'::jsonb),
  ('d0000000-0000-0000-0000-00000000000b', 'b0000000-0000-0000-0000-00000000000b', 'recruiter', 'Recruteur', '#000', '#fff', '{"talent": true}'::jsonb),
  ('d0000000-0000-0000-0000-00000000000c', 'a0000000-0000-0000-0000-00000000000a', 'support', 'Support', '#000', '#fff', '{"talent": false}'::jsonb);

insert into public.entity_team_members (id, entity_id, user_id, role_id, email) values
  ('e0000000-0000-0000-0000-00000000000a', 'a0000000-0000-0000-0000-00000000000a', 'c0000000-0000-0000-0000-000000000003', 'd0000000-0000-0000-0000-00000000000a', 'team-a-talent@test.local'),
  ('e0000000-0000-0000-0000-00000000000b', 'b0000000-0000-0000-0000-00000000000b', 'c0000000-0000-0000-0000-000000000004', 'd0000000-0000-0000-0000-00000000000b', 'team-b-talent@test.local'),
  ('e0000000-0000-0000-0000-00000000000c', 'a0000000-0000-0000-0000-00000000000a', 'c0000000-0000-0000-0000-000000000006', 'd0000000-0000-0000-0000-00000000000c', 'team-a-notalent@test.local');

insert into public.entity_job_offers (id, entity_id, title, contract_type, status) values
  ('f0000000-0000-0000-0000-00000000000a', 'a0000000-0000-0000-0000-00000000000a', 'Offre active A', 'cdi', 'active'),
  ('f0000000-0000-0000-0000-00000000000b', 'a0000000-0000-0000-0000-00000000000a', 'Offre inactive A', 'cdi', 'inactive'),
  ('f0000000-0000-0000-0000-00000000000c', 'b0000000-0000-0000-0000-00000000000b', 'Offre active B', 'cdi', 'active');

-- Aptitude preexistante (creee hors test, superuser) pour prouver
-- l'immutabilite independamment de la creation.
insert into public.job_skills (id, label, created_by) values
  ('99000000-0000-0000-0000-000000000001', 'Permis B', 'a0000000-0000-0000-0000-00000000000a');

-- ============================================================
-- Section 1 : job_skills -- lecture publique, normalisation, creation a
-- l'usage, immutabilite (point a, b, c du mandat).
-- ============================================================
set local role anon;

select results_eq(
  $$select label from public.job_skills where id = '99000000-0000-0000-0000-000000000001'$$,
  ARRAY['Permis B'],
  'anonyme : lit le referentiel (point c)'
);

select results_eq(
  $$select normalized_label from public.job_skills where id = '99000000-0000-0000-0000-000000000001'$$,
  ARRAY['permis b'],
  'normalisation : colonne calculee correcte des la creation (minuscules)'
);

select throws_ok(
  $$insert into public.job_skills (label) values ('Hack')$$,
  '42501',
  'new row violates row-level security policy for table "job_skills"',
  'anonyme : ne peut pas creer d''aptitude'
);

set local role authenticated;
set local request.jwt.claim.sub = 'c0000000-0000-0000-0000-000000000003';

select lives_ok(
  $$insert into public.job_skills (id, label) values ('99000000-0000-0000-0000-000000000002', 'Machines a bois')$$,
  'equipe A (talent) : peut creer une aptitude (point a)'
);

select results_eq(
  $$select created_by from public.job_skills where id = '99000000-0000-0000-0000-000000000002'$$,
  ARRAY['c0000000-0000-0000-0000-000000000003'::uuid],
  'created_by rempli automatiquement via DEFAULT auth.uid()'
);

select throws_ok(
  $$insert into public.job_skills (label, created_by) values ('Faux forge', 'a0000000-0000-0000-0000-00000000000a')$$,
  '42501',
  'new row violates row-level security policy for table "job_skills"',
  'equipe A (talent) : ne peut pas creer une aptitude au nom d''un autre utilisateur'
);

select results_eq(
  $$update public.job_skills set label = 'hack' where id = '99000000-0000-0000-0000-000000000001' returning id$$,
  ARRAY[]::uuid[],
  'equipe A (talent) : ne peut pas modifier une aptitude existante, meme creee par sa propre entite (0 ligne, point b)'
);

select results_eq(
  $$delete from public.job_skills where id = '99000000-0000-0000-0000-000000000001' returning id$$,
  ARRAY[]::uuid[],
  'equipe A (talent) : ne peut pas supprimer une aptitude existante (0 ligne, point b)'
);

select lives_ok(
  $$insert into public.job_skills (id, label) values ('99000000-0000-0000-0000-000000000004', 'Café  Bio')$$,
  'equipe A (talent) : cree une aptitude avec accent + espace double'
);

select results_eq(
  $$select normalized_label from public.job_skills where id = '99000000-0000-0000-0000-000000000004'$$,
  ARRAY['cafe bio'],
  'normalisation : accents retires + espaces multiples reduits (Café  Bio -> cafe bio)'
);

select throws_ok(
  $$insert into public.job_skills (label) values ('CAFE BIO')$$,
  '23505',
  'duplicate key value violates unique constraint "job_skills_normalized_label_key"',
  'unicite : un libelle qui normalise pareil (CAFE BIO / Café  Bio) est rejete comme doublon'
);

-- ============================================================
-- Section 2 : entity_job_offer_skills -- attache a SON offre (point a),
-- jamais a celle d'une autre entite (point b), visibilite calquee sur
-- entity_job_offer_media.
-- ============================================================
select lives_ok(
  $$insert into public.entity_job_offer_skills (offer_id, skill_id, display_order) values ('f0000000-0000-0000-0000-00000000000a', '99000000-0000-0000-0000-000000000002', 0)$$,
  'equipe A (talent) : attache l''aptitude a SON offre active (point a)'
);

select throws_ok(
  $$insert into public.entity_job_offer_skills (offer_id, skill_id) values ('f0000000-0000-0000-0000-00000000000c', '99000000-0000-0000-0000-000000000002')$$,
  '42501',
  'new row violates row-level security policy for table "entity_job_offer_skills"',
  'equipe A (talent) : ne peut pas attacher une aptitude a l''offre de l''entite B (point b)'
);

select lives_ok(
  $$insert into public.entity_job_offer_skills (offer_id, skill_id, display_order) values ('f0000000-0000-0000-0000-00000000000b', '99000000-0000-0000-0000-000000000002', 1)$$,
  'equipe A (talent) : attache aussi l''aptitude a l''offre inactive de A'
);

set local role anon;

select results_eq(
  $$select offer_id from public.entity_job_offer_skills order by offer_id$$,
  ARRAY['f0000000-0000-0000-0000-00000000000a'::uuid],
  'anonyme : voit seulement le lien de l''offre active de A, jamais celui de l''inactive'
);

set local role authenticated;
set local request.jwt.claim.sub = 'c0000000-0000-0000-0000-000000000005';

select results_eq(
  $$select offer_id from public.entity_job_offer_skills order by offer_id$$,
  ARRAY['f0000000-0000-0000-0000-00000000000a'::uuid],
  'authentifie sans lien : meme visibilite qu''anonyme (aucun acces equipe)'
);

select throws_ok(
  $$insert into public.entity_job_offer_skills (offer_id, skill_id) values ('f0000000-0000-0000-0000-00000000000a', '99000000-0000-0000-0000-000000000002')$$,
  '42501',
  'new row violates row-level security policy for table "entity_job_offer_skills"',
  'authentifie sans lien : ne peut pas attacher d''aptitude sur une offre de A'
);

set local request.jwt.claim.sub = 'c0000000-0000-0000-0000-000000000004';

select results_eq(
  $$select offer_id from public.entity_job_offer_skills where offer_id in ('f0000000-0000-0000-0000-00000000000a', 'f0000000-0000-0000-0000-00000000000b') order by offer_id$$,
  ARRAY['f0000000-0000-0000-0000-00000000000a'::uuid],
  'equipe B (talent sur B) : sur A, voit seulement le lien actif (aucune fuite cross-entity)'
);

select throws_ok(
  $$insert into public.entity_job_offer_skills (offer_id, skill_id) values ('f0000000-0000-0000-0000-00000000000a', '99000000-0000-0000-0000-000000000002')$$,
  '42501',
  'new row violates row-level security policy for table "entity_job_offer_skills"',
  'equipe B (talent sur B) : ne peut pas attacher sur une offre de A'
);

select results_eq(
  $$update public.entity_job_offer_skills set display_order = 9 where offer_id = 'f0000000-0000-0000-0000-00000000000b' returning offer_id$$,
  ARRAY[]::uuid[],
  'equipe B (talent sur B) : ne peut pas modifier le lien de l''offre inactive de A (0 ligne)'
);

select results_eq(
  $$delete from public.entity_job_offer_skills where offer_id = 'f0000000-0000-0000-0000-00000000000a' returning offer_id$$,
  ARRAY[]::uuid[],
  'equipe B (talent sur B) : ne peut pas supprimer le lien de l''offre active de A (0 ligne)'
);

set local request.jwt.claim.sub = 'c0000000-0000-0000-0000-000000000003';

select results_eq(
  $$select offer_id from public.entity_job_offer_skills where offer_id in ('f0000000-0000-0000-0000-00000000000a', 'f0000000-0000-0000-0000-00000000000b') order by offer_id$$,
  ARRAY['f0000000-0000-0000-0000-00000000000a'::uuid, 'f0000000-0000-0000-0000-00000000000b'::uuid],
  'equipe A (talent) : voit les 2 liens de A, y compris celui de l''offre inactive'
);

select lives_ok(
  $$update public.entity_job_offer_skills set display_order = 2 where offer_id = 'f0000000-0000-0000-0000-00000000000b'$$,
  'equipe A (talent) : peut modifier l''ordre d''affichage sur une offre de A'
);

select lives_ok(
  $$delete from public.entity_job_offer_skills where offer_id = 'f0000000-0000-0000-0000-00000000000b'$$,
  'equipe A (talent) : peut detacher une aptitude d''une offre de A'
);

set local request.jwt.claim.sub = 'c0000000-0000-0000-0000-000000000006';

select throws_ok(
  $$insert into public.entity_job_offer_skills (offer_id, skill_id) values ('f0000000-0000-0000-0000-00000000000a', '99000000-0000-0000-0000-000000000004')$$,
  '42501',
  'new row violates row-level security policy for table "entity_job_offer_skills"',
  'equipe A sans permission talent : ne peut pas attacher d''aptitude (appartenance a l''equipe seule insuffisante)'
);

-- ============================================================
-- Section 3 : user_skills -- own-only, aucune notion d'equipe.
-- ============================================================
set local request.jwt.claim.sub = 'c0000000-0000-0000-0000-000000000007';

select lives_ok(
  $$insert into public.user_skills (user_id, skill_id) values ('c0000000-0000-0000-0000-000000000007', '99000000-0000-0000-0000-000000000002')$$,
  'candidat X : declare une aptitude sur son propre profil'
);

select throws_ok(
  $$insert into public.user_skills (user_id, skill_id) values ('c0000000-0000-0000-0000-000000000008', '99000000-0000-0000-0000-000000000004')$$,
  '42501',
  'new row violates row-level security policy for table "user_skills"',
  'candidat X : ne peut pas declarer une aptitude au nom du profil d''un autre candidat'
);

select results_eq(
  $$select user_id from public.user_skills$$,
  ARRAY['c0000000-0000-0000-0000-000000000007'::uuid],
  'candidat X : lit sa propre declaration'
);

set local request.jwt.claim.sub = 'c0000000-0000-0000-0000-000000000008';

select results_eq(
  $$select user_id from public.user_skills$$,
  ARRAY[]::uuid[],
  'candidat Y : ne voit pas les aptitudes declarees par X (own-only)'
);

select results_eq(
  $$delete from public.user_skills where user_id = 'c0000000-0000-0000-0000-000000000007' returning user_id$$,
  ARRAY[]::uuid[],
  'candidat Y : ne peut pas supprimer la declaration de X (0 ligne)'
);

set local request.jwt.claim.sub = 'c0000000-0000-0000-0000-000000000007';

select lives_ok(
  $$delete from public.user_skills where user_id = 'c0000000-0000-0000-0000-000000000007'$$,
  'candidat X : peut supprimer sa propre declaration'
);

select * from finish();
rollback;
