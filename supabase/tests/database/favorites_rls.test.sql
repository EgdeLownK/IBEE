-- Tests RLS pour `favorites` : prouve que la faille corrigée le 24/07
-- (migration 20260724100000_favorites_rls_restrict_owner.sql) ne régresse pas.
-- 3 cas testés : owner, autre utilisateur authentifié, anonyme.
begin;
create extension if not exists pgtap with schema extensions;

select plan(9);

-- Fixtures posées en tant que superuser (RLS bypassée pour la préparation des données).
-- entity.user_id / favorites.user_id référencent auth.users (FK) : insérer les
-- utilisateurs de test d'abord. Note : ceci déclenche le trigger on_auth_user_created
-- qui crée une entity supplémentaire par utilisateur — sans impact sur les
-- assertions ci-dessous (tout est de toute façon annulé par le rollback final).
insert into auth.users (id, email) values
  ('a0000000-0000-0000-0000-00000000000a', 'test-fav-a@test.local'),
  ('b0000000-0000-0000-0000-00000000000b', 'test-fav-b@test.local');

insert into public.entity (id, slug, display_name, user_id) values
  ('a0000000-0000-0000-0000-00000000000a', 'test-fav-owner-a', 'Owner A', 'a0000000-0000-0000-0000-00000000000a'),
  ('b0000000-0000-0000-0000-00000000000b', 'test-fav-owner-b', 'Owner B', 'b0000000-0000-0000-0000-00000000000b');

insert into public.favorites (id, user_id, entity_id) values
  ('fa000000-0000-0000-0000-00000000000a', 'a0000000-0000-0000-0000-00000000000a', 'b0000000-0000-0000-0000-00000000000b'),
  ('fb000000-0000-0000-0000-00000000000b', 'b0000000-0000-0000-0000-00000000000b', 'a0000000-0000-0000-0000-00000000000a');

-- Cas 1 : anonyme (aucun jwt) — exactement le scénario de la faille corrigée.
set local role anon;

select results_eq(
  $$select count(*) from public.favorites$$,
  ARRAY[0::bigint],
  'anonyme : ne lit aucun favori (régression du fix 20260724100000)'
);

select throws_ok(
  $$insert into public.favorites (user_id, entity_id) values (null, 'a0000000-0000-0000-0000-00000000000a')$$,
  '42501',
  'anonyme : ne peut pas insérer de favori (même avec user_id null)'
);

-- Cas 2 : owner (user A).
set local role authenticated;
set local request.jwt.claim.sub = 'a0000000-0000-0000-0000-00000000000a';

select results_eq(
  $$select id from public.favorites order by id$$,
  ARRAY['fa000000-0000-0000-0000-00000000000a'::uuid],
  'owner (A) : ne voit que son propre favori'
);

select lives_ok(
  $$insert into public.favorites (user_id, entity_id) values ('a0000000-0000-0000-0000-00000000000a', 'b0000000-0000-0000-0000-00000000000b')$$,
  'owner (A) : peut insérer son propre favori'
);

select throws_ok(
  $$insert into public.favorites (user_id, entity_id) values ('b0000000-0000-0000-0000-00000000000b', 'a0000000-0000-0000-0000-00000000000a')$$,
  '42501',
  'owner (A) : ne peut pas insérer un favori au nom de B'
);

-- Cas 3 : autre utilisateur authentifié (user B) tente sur les données de A.
set local request.jwt.claim.sub = 'b0000000-0000-0000-0000-00000000000b';

select throws_ok(
  $$insert into public.favorites (user_id, entity_id) values ('a0000000-0000-0000-0000-00000000000a', 'a0000000-0000-0000-0000-00000000000a')$$,
  '42501',
  'autre user (B) : ne peut pas insérer un favori au nom de A'
);

select results_eq(
  $$delete from public.favorites where id = 'fa000000-0000-0000-0000-00000000000a' returning id$$,
  ARRAY[]::uuid[],
  'autre user (B) : ne peut pas supprimer le favori de A (0 ligne affectée)'
);

select results_eq(
  $$select id from public.favorites order by id$$,
  ARRAY['fb000000-0000-0000-0000-00000000000b'::uuid],
  'autre user (B) : ne voit que son propre favori, jamais ceux de A (y compris celui inséré au test précédent)'
);

-- Cleanup en tant que owner (A) — prouve aussi que le delete "own" fonctionne toujours.
set local request.jwt.claim.sub = 'a0000000-0000-0000-0000-00000000000a';

select lives_ok(
  $$delete from public.favorites where id = 'fa000000-0000-0000-0000-00000000000a'$$,
  'owner (A) : peut supprimer son propre favori'
);

select * from finish();
rollback;
