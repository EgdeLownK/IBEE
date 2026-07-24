-- Tests RLS pour `entity` : lecture publique (doctrine SEO, pages profils
-- indexables) mais écriture strictement scopée à l'owner.
-- 3 cas testés : owner, autre utilisateur authentifié, anonyme.
begin;
create extension if not exists pgtap with schema extensions;

select plan(6);

-- entity.user_id référence auth.users (FK) : insérer les utilisateurs de test
-- d'abord. Déclenche on_auth_user_created (crée une entity par utilisateur),
-- sans impact sur les assertions ci-dessous qui filtrent par id explicite.
insert into auth.users (id, email) values
  ('a0000000-0000-0000-0000-00000000000a', 'test-entity-a@test.local'),
  ('b0000000-0000-0000-0000-00000000000b', 'test-entity-b@test.local');

insert into public.entity (id, slug, display_name, user_id) values
  ('a0000000-0000-0000-0000-00000000000a', 'test-entity-owner-a', 'Owner A', 'a0000000-0000-0000-0000-00000000000a'),
  ('b0000000-0000-0000-0000-00000000000b', 'test-entity-owner-b', 'Owner B', 'b0000000-0000-0000-0000-00000000000b');

-- Cas 1 : anonyme.
set local role anon;

select results_eq(
  $$select count(*) from public.entity where id in ('a0000000-0000-0000-0000-00000000000a', 'b0000000-0000-0000-0000-00000000000b')$$,
  ARRAY[2::bigint],
  'anonyme : lecture publique des entités (doctrine SEO, pages profils indexables)'
);

select results_eq(
  $$update public.entity set bio = 'hack' where id = 'a0000000-0000-0000-0000-00000000000a' returning id$$,
  ARRAY[]::uuid[],
  'anonyme : ne peut modifier aucune entité (0 ligne affectée)'
);

-- Cas 2 : owner (A).
set local role authenticated;
set local request.jwt.claim.sub = 'a0000000-0000-0000-0000-00000000000a';

select lives_ok(
  $$update public.entity set bio = 'bio à jour par A' where id = 'a0000000-0000-0000-0000-00000000000a'$$,
  'owner (A) : peut modifier sa propre entité'
);

select throws_ok(
  $$insert into public.entity (slug, display_name, user_id) values ('test-entity-new', 'New', 'a0000000-0000-0000-0000-00000000000a')$$,
  '42501',
  'owner (A) : ne peut pas créer d''entité directement (aucune policy INSERT — passe par le trigger auth)'
);

-- Cas 3 : autre utilisateur authentifié (B) tente sur l'entité de A.
set local request.jwt.claim.sub = 'b0000000-0000-0000-0000-00000000000b';

select results_eq(
  $$update public.entity set bio = 'hacked by B' where id = 'a0000000-0000-0000-0000-00000000000a' returning id$$,
  ARRAY[]::uuid[],
  'autre user (B) : ne peut pas modifier l''entité de A (0 ligne affectée)'
);

select lives_ok(
  $$update public.entity set bio = 'bio de B' where id = 'b0000000-0000-0000-0000-00000000000b'$$,
  'autre user (B) : peut modifier sa propre entité'
);

select * from finish();
rollback;
