-- Tests RLS pour `bookings` : policy owner (entity.user_id = auth.uid())
-- + insert public (booking) + RPC get_booked_time_ranges (lecture publique
-- des creneaux occupes sans exposer les donnees du client). Ecrit apres avoir
-- trouve bookings_owner_select ouvert en USING (true) pour anon/authenticated
-- en prod (jamais migre) -- fuite de nom/email/telephone client. Corrige en
-- migration 20260725110000. Ces tests figent le comportement attendu pour
-- que la regression ne revienne jamais.
begin;
create extension if not exists pgtap with schema extensions;

select plan(10);

-- Fixtures (superuser, RLS bypassee).
insert into auth.users (id, email) values
  ('a0000000-0000-0000-0000-00000000000a', 'owner-a@test.local'),
  ('b0000000-0000-0000-0000-00000000000b', 'owner-b@test.local');

insert into public.entity (id, slug, display_name, user_id) values
  ('a0000000-0000-0000-0000-00000000000a', 'test-bookings-entity-a', 'Entity A', 'a0000000-0000-0000-0000-00000000000a'),
  ('b0000000-0000-0000-0000-00000000000b', 'test-bookings-entity-b', 'Entity B', 'b0000000-0000-0000-0000-00000000000b');

insert into public.appointment_types (id, entity_id, title, duration_minutes) values
  ('c0000000-0000-0000-0000-00000000000a', 'a0000000-0000-0000-0000-00000000000a', 'Consultation A', 30),
  ('c0000000-0000-0000-0000-00000000000b', 'b0000000-0000-0000-0000-00000000000b', 'Consultation B', 30);

insert into public.bookings (id, appointment_type_id, entity_id, booker_name, booker_email, start_at, end_at, status) values
  ('d0000000-0000-0000-0000-00000000000a', 'c0000000-0000-0000-0000-00000000000a', 'a0000000-0000-0000-0000-00000000000a', 'Client X', 'clientx@test.local', '2026-08-01T10:00:00Z', '2026-08-01T10:30:00Z', 'confirmed'),
  ('d0000000-0000-0000-0000-00000000000b', 'c0000000-0000-0000-0000-00000000000b', 'b0000000-0000-0000-0000-00000000000b', 'Client Y', 'clienty@test.local', '2026-08-01T14:00:00Z', '2026-08-01T14:30:00Z', 'confirmed');

-- Cas 1 : anonyme.
set local role anon;

select results_eq(
  $$select count(*) from public.bookings$$,
  ARRAY[0::bigint],
  'anonyme : ne lit aucune reservation (fuite corrigee, ex-USING (true))'
);

select lives_ok(
  $$insert into public.bookings (appointment_type_id, entity_id, booker_name, booker_email, start_at, end_at) values ('c0000000-0000-0000-0000-00000000000a', 'a0000000-0000-0000-0000-00000000000a', 'Anon Booker', 'anon@test.local', '2026-08-02T10:00:00Z', '2026-08-02T10:30:00Z')$$,
  'anonyme : peut toujours creer une reservation (bookings_public_insert intact)'
);

select results_eq(
  $$select start_at, end_at from public.get_booked_time_ranges('a0000000-0000-0000-0000-00000000000a', '2026-08-01T00:00:00Z', '2026-08-01T23:59:59Z') order by start_at$$,
  $$values ('2026-08-01T10:00:00Z'::timestamptz, '2026-08-01T10:30:00Z'::timestamptz)$$,
  'anonyme : get_booked_time_ranges() renvoie le creneau occupe de A sans exposer booker_name/booker_email'
);

select results_eq(
  $$select start_at, end_at from public.get_booked_time_ranges('b0000000-0000-0000-0000-00000000000b', '2026-08-01T00:00:00Z', '2026-08-01T23:59:59Z') order by start_at$$,
  $$values ('2026-08-01T14:00:00Z'::timestamptz, '2026-08-01T14:30:00Z'::timestamptz)$$,
  'anonyme : get_booked_time_ranges() scope correctement par entity_id (B ne recoit pas le creneau de A)'
);

-- Cas 2 : owner A.
set local role authenticated;
set local request.jwt.claim.sub = 'a0000000-0000-0000-0000-00000000000a';

select results_eq(
  $$select count(*) from public.bookings where entity_id = 'a0000000-0000-0000-0000-00000000000a'$$,
  ARRAY[2::bigint],
  'owner A : voit ses 2 reservations sur l''entity A (la confirmee + celle inseree par l''anonyme au cas 1)'
);

select results_eq(
  $$select id from public.bookings where entity_id = 'b0000000-0000-0000-0000-00000000000b'$$,
  ARRAY[]::uuid[],
  'owner A : ne voit aucune reservation de l''entity B'
);

select lives_ok(
  $$update public.bookings set notes = 'edit' where id = 'd0000000-0000-0000-0000-00000000000a'$$,
  'owner A : peut modifier sa propre reservation'
);

-- Cas 3 (critique) : owner B tente sur les reservations de l'entity A.
set local request.jwt.claim.sub = 'b0000000-0000-0000-0000-00000000000b';

select results_eq(
  $$update public.bookings set notes = 'hack' where id = 'd0000000-0000-0000-0000-00000000000a' returning id$$,
  ARRAY[]::uuid[],
  'owner B : ne peut pas modifier une reservation de l''entity A (0 ligne affectee)'
);

select results_eq(
  $$delete from public.bookings where id = 'd0000000-0000-0000-0000-00000000000a' returning id$$,
  ARRAY[]::uuid[],
  'owner B : ne peut pas supprimer une reservation de l''entity A (0 ligne affectee)'
);

-- Cleanup en tant qu'owner A (prouve aussi que le delete owner fonctionne).
set local request.jwt.claim.sub = 'a0000000-0000-0000-0000-00000000000a';

select lives_ok(
  $$delete from public.bookings where entity_id = 'a0000000-0000-0000-0000-00000000000a'$$,
  'owner A : peut supprimer ses propres reservations'
);

select * from finish();
rollback;
