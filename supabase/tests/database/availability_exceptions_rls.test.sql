-- Tests RLS pour `availability_exceptions` : la policy
-- "availability_exceptions_public_read" etait ouverte en USING (true) pour
-- anon/authenticated, exposant toutes les exceptions de toutes les entities
-- (y compris le champ libre `reason`) a n'importe quel visiteur. Corrige en
-- migration 20260727100000_availability_exceptions_public_rpc.sql : policy
-- retiree, remplacee par get_availability_exception_for_date() SECURITY
-- DEFINER qui ne retourne que is_blocked/start_time/end_time pour UNE
-- entity_id et UNE date. Ces tests figent le comportement attendu pour que
-- la regression ne revienne jamais.
begin;
create extension if not exists pgtap with schema extensions;

select plan(12);

-- Fixtures (superuser, RLS bypassee).
insert into auth.users (id, email) values
  ('a0000000-0000-0000-0000-00000000000a', 'owner-avail-a@test.local'),
  ('b0000000-0000-0000-0000-00000000000b', 'owner-avail-b@test.local');

insert into public.entity (id, slug, display_name, user_id) values
  ('a0000000-0000-0000-0000-00000000000a', 'test-avail-entity-a', 'Entity A', 'a0000000-0000-0000-0000-00000000000a'),
  ('b0000000-0000-0000-0000-00000000000b', 'test-avail-entity-b', 'Entity B', 'b0000000-0000-0000-0000-00000000000b');

-- Entity A : jour bloque (ferie). Entity B : horaires personnalises.
insert into public.availability_exceptions (id, entity_id, date, is_blocked, start_time, end_time, reason) values
  ('e0000000-0000-0000-0000-00000000000a', 'a0000000-0000-0000-0000-00000000000a', '2026-08-10', true, null, null, 'Ferme pour conges'),
  ('e0000000-0000-0000-0000-00000000000b', 'b0000000-0000-0000-0000-00000000000b', '2026-08-11', false, '09:00:00', '12:00:00', 'Horaires reduits');

-- Cas 1 : anonyme.
set local role anon;

select results_eq(
  $$select count(*) from public.availability_exceptions$$,
  ARRAY[0::bigint],
  'anonyme : ne lit aucune exception en direct (policy public_read retiree)'
);

select throws_ok(
  $$insert into public.availability_exceptions (entity_id, date, is_blocked) values ('a0000000-0000-0000-0000-00000000000a', '2026-08-12', true)$$,
  '42501',
  'new row violates row-level security policy for table "availability_exceptions"',
  'anonyme : ne peut pas inserer d''exception'
);

select results_eq(
  $$select is_blocked, start_time, end_time from public.get_availability_exception_for_date('a0000000-0000-0000-0000-00000000000a', '2026-08-10')$$,
  $$values (true, null::time, null::time)$$,
  'anonyme : la RPC renvoie le jour bloque de A (is_blocked/start_time/end_time uniquement)'
);

select results_eq(
  $$select is_blocked, start_time, end_time from public.get_availability_exception_for_date('b0000000-0000-0000-0000-00000000000b', '2026-08-11')$$,
  $$values (false, '09:00:00'::time, '12:00:00'::time)$$,
  'anonyme : la RPC renvoie les horaires personnalises de B pour la date demandee'
);

select is_empty(
  $$select * from public.get_availability_exception_for_date('a0000000-0000-0000-0000-00000000000a', '2026-08-11')$$,
  'anonyme : la RPC ne renvoie rien pour une date sans exception (pas de fuite sur d''autres dates)'
);

select throws_ok(
  $$select reason from public.get_availability_exception_for_date('a0000000-0000-0000-0000-00000000000a', '2026-08-10')$$,
  '42703',
  null,
  'anonyme : la colonne `reason` n''existe pas dans le resultat de la RPC (jamais exposee)'
);

-- Cas 2 : owner A.
set local role authenticated;
set local request.jwt.claim.sub = 'a0000000-0000-0000-0000-00000000000a';

select results_eq(
  $$select count(*) from public.availability_exceptions where entity_id = 'a0000000-0000-0000-0000-00000000000a'$$,
  ARRAY[1::bigint],
  'owner A : voit sa propre exception'
);

select results_eq(
  $$select count(*) from public.availability_exceptions where entity_id = 'b0000000-0000-0000-0000-00000000000b'$$,
  ARRAY[0::bigint],
  'owner A : ne voit pas l''exception de l''entity B'
);

select lives_ok(
  $$update public.availability_exceptions set reason = 'Conges prolonges' where id = 'e0000000-0000-0000-0000-00000000000a'$$,
  'owner A : peut modifier sa propre exception'
);

-- Cas 3 (critique) : owner B tente sur l'exception de l'entity A.
set local request.jwt.claim.sub = 'b0000000-0000-0000-0000-00000000000b';

select results_eq(
  $$update public.availability_exceptions set reason = 'hack' where id = 'e0000000-0000-0000-0000-00000000000a' returning id$$,
  ARRAY[]::uuid[],
  'owner B : ne peut pas modifier l''exception de l''entity A (0 ligne affectee)'
);

select results_eq(
  $$delete from public.availability_exceptions where id = 'e0000000-0000-0000-0000-00000000000a' returning id$$,
  ARRAY[]::uuid[],
  'owner B : ne peut pas supprimer l''exception de l''entity A (0 ligne affectee)'
);

-- Cleanup en tant qu'owner A (prouve aussi que le delete owner fonctionne).
set local request.jwt.claim.sub = 'a0000000-0000-0000-0000-00000000000a';

select lives_ok(
  $$delete from public.availability_exceptions where entity_id = 'a0000000-0000-0000-0000-00000000000a'$$,
  'owner A : peut supprimer sa propre exception'
);

select * from finish();
rollback;
