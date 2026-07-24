-- Tests RLS pour le domaine revenus (`entity_payout_schedules`,
-- `entity_payout_allocations`, `entity_payout_transfers`) : toutes les
-- policies scopent via une sous-requête `EXISTS (... entity.user_id =
-- auth.uid())`. 3 cas testés : owner, autre utilisateur authentifié, anonyme.
-- Couverture complète (SELECT/INSERT/UPDATE/DELETE) sur `schedules` ; les 2
-- autres tables suivent exactement le même pattern, couverture ciblée
-- (SELECT + une écriture) pour confirmer que le scoping tient aussi là.
begin;
create extension if not exists pgtap with schema extensions;

select plan(21);

-- Fixtures.
insert into auth.users (id, email) values
  ('a0000000-0000-0000-0000-00000000000a', 'owner-a@test.local'),
  ('b0000000-0000-0000-0000-00000000000b', 'owner-b@test.local');

insert into public.entity (id, slug, display_name, user_id) values
  ('a0000000-0000-0000-0000-00000000000a', 'test-payout-entity-a', 'Entity A', 'a0000000-0000-0000-0000-00000000000a'),
  ('b0000000-0000-0000-0000-00000000000b', 'test-payout-entity-b', 'Entity B', 'b0000000-0000-0000-0000-00000000000b');

insert into public.entity_payout_schedules (id, entity_id, recurrence, next_run_at) values
  ('11100000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-00000000000a', 'monthly', now() + interval '1 month'),
  ('22200000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-00000000000b', 'monthly', now() + interval '1 month');

insert into public.entity_payout_allocations (id, schedule_id, entity_id, recipient_type, amount_type, amount_value) values
  ('33300000-0000-0000-0000-000000000003', '11100000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-00000000000a', 'owner', 'percent', 100),
  ('44400000-0000-0000-0000-000000000004', '22200000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-00000000000b', 'owner', 'percent', 100);

insert into public.entity_payout_transfers (id, entity_id, schedule_id, recipient_type, recipient_name, recipient_email, period_start, period_end, amount_cents) values
  ('55500000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-00000000000a', '11100000-0000-0000-0000-000000000001', 'owner', 'Owner A', 'owner-a@test.local', now() - interval '1 month', now(), 10000),
  ('66600000-0000-0000-0000-000000000006', 'b0000000-0000-0000-0000-00000000000b', '22200000-0000-0000-0000-000000000002', 'owner', 'Owner B', 'owner-b@test.local', now() - interval '1 month', now(), 20000);

-- ============================================================
-- entity_payout_schedules — couverture complète
-- ============================================================

-- Cas anonyme.
set local role anon;

select results_eq(
  $$select count(*) from public.entity_payout_schedules$$,
  ARRAY[0::bigint],
  'schedules — anonyme : ne lit aucun planning de revenus'
);

select throws_ok(
  $$insert into public.entity_payout_schedules (entity_id, recurrence, next_run_at) values ('a0000000-0000-0000-0000-00000000000a', 'monthly', now())$$,
  '42501',
  'new row violates row-level security policy for table "entity_payout_schedules"',
  'schedules — anonyme : ne peut pas créer de planning de revenus'
);

-- Cas owner (A).
set local role authenticated;
set local request.jwt.claim.sub = 'a0000000-0000-0000-0000-00000000000a';

select results_eq(
  $$select id from public.entity_payout_schedules order by id$$,
  ARRAY['11100000-0000-0000-0000-000000000001'::uuid],
  'schedules — owner (A) : ne voit que le planning de sa propre entity'
);

select lives_ok(
  $$update public.entity_payout_schedules set is_active = false where id = '11100000-0000-0000-0000-000000000001'$$,
  'schedules — owner (A) : peut modifier le planning de sa propre entity'
);

-- Cas autre user authentifié (owner B tente sur le planning de A).
set local request.jwt.claim.sub = 'b0000000-0000-0000-0000-00000000000b';

select results_eq(
  $$select id from public.entity_payout_schedules order by id$$,
  ARRAY['22200000-0000-0000-0000-000000000002'::uuid],
  'schedules — autre user (B) : ne voit que le planning de sa propre entity, jamais celui de A'
);

select results_eq(
  $$update public.entity_payout_schedules set is_active = false where id = '11100000-0000-0000-0000-000000000001' returning id$$,
  ARRAY[]::uuid[],
  'schedules — autre user (B) : ne peut pas modifier le planning de A (0 ligne affectée)'
);

select results_eq(
  $$delete from public.entity_payout_schedules where id = '11100000-0000-0000-0000-000000000001' returning id$$,
  ARRAY[]::uuid[],
  'schedules — autre user (B) : ne peut pas supprimer le planning de A (0 ligne affectée)'
);

-- Cleanup owner (A).
set local request.jwt.claim.sub = 'a0000000-0000-0000-0000-00000000000a';

select lives_ok(
  $$delete from public.entity_payout_schedules where id = '11100000-0000-0000-0000-000000000001'$$,
  'schedules — owner (A) : peut supprimer le planning de sa propre entity'
);

-- ============================================================
-- entity_payout_allocations — même pattern, couverture ciblée
-- ============================================================

set local role anon;

select results_eq(
  $$select count(*) from public.entity_payout_allocations$$,
  ARRAY[0::bigint],
  'allocations — anonyme : ne lit aucune allocation'
);

set local role authenticated;
set local request.jwt.claim.sub = 'a0000000-0000-0000-0000-00000000000a';

select results_eq(
  $$select id from public.entity_payout_allocations order by id$$,
  ARRAY['33300000-0000-0000-0000-000000000003'::uuid],
  'allocations — owner (A) : ne voit que l''allocation de sa propre entity'
);

select lives_ok(
  $$update public.entity_payout_allocations set amount_value = 50 where id = '33300000-0000-0000-0000-000000000003'$$,
  'allocations — owner (A) : peut modifier l''allocation de sa propre entity'
);

set local request.jwt.claim.sub = 'b0000000-0000-0000-0000-00000000000b';

select results_eq(
  $$select id from public.entity_payout_allocations order by id$$,
  ARRAY['44400000-0000-0000-0000-000000000004'::uuid],
  'allocations — autre user (B) : ne voit que l''allocation de sa propre entity, jamais celle de A'
);

select results_eq(
  $$delete from public.entity_payout_allocations where id = '33300000-0000-0000-0000-000000000003' returning id$$,
  ARRAY[]::uuid[],
  'allocations — autre user (B) : ne peut pas supprimer l''allocation de A (0 ligne affectée)'
);

select throws_ok(
  $$insert into public.entity_payout_allocations (schedule_id, entity_id, recipient_type, amount_type, amount_value) values ('22200000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-00000000000a', 'owner', 'percent', 100)$$,
  '42501',
  'new row violates row-level security policy for table "entity_payout_allocations"',
  'allocations — autre user (B) : ne peut pas créer d''allocation au nom de l''entity A'
);

-- ============================================================
-- entity_payout_transfers — même pattern, couverture ciblée
-- ============================================================

set local role anon;

select results_eq(
  $$select count(*) from public.entity_payout_transfers$$,
  ARRAY[0::bigint],
  'transfers — anonyme : ne lit aucun virement'
);

select throws_ok(
  $$insert into public.entity_payout_transfers (entity_id, recipient_type, recipient_name, recipient_email, period_start, period_end, amount_cents) values ('a0000000-0000-0000-0000-00000000000a', 'owner', 'Hack', 'hack@test.local', now(), now(), 1)$$,
  '42501',
  'new row violates row-level security policy for table "entity_payout_transfers"',
  'transfers — anonyme : ne peut pas créer de virement'
);

set local role authenticated;
set local request.jwt.claim.sub = 'a0000000-0000-0000-0000-00000000000a';

select results_eq(
  $$select id from public.entity_payout_transfers order by id$$,
  ARRAY['55500000-0000-0000-0000-000000000005'::uuid],
  'transfers — owner (A) : ne voit que le virement de sa propre entity'
);

select lives_ok(
  $$update public.entity_payout_transfers set status = 'completed' where id = '55500000-0000-0000-0000-000000000005'$$,
  'transfers — owner (A) : peut modifier le virement de sa propre entity'
);

set local request.jwt.claim.sub = 'b0000000-0000-0000-0000-00000000000b';

select results_eq(
  $$select id from public.entity_payout_transfers order by id$$,
  ARRAY['66600000-0000-0000-0000-000000000006'::uuid],
  'transfers — autre user (B) : ne voit que le virement de sa propre entity, jamais celui de A'
);

select results_eq(
  $$update public.entity_payout_transfers set status = 'completed' where id = '55500000-0000-0000-0000-000000000005' returning id$$,
  ARRAY[]::uuid[],
  'transfers — autre user (B) : ne peut pas modifier le virement de A (0 ligne affectée)'
);

select results_eq(
  $$delete from public.entity_payout_transfers where id = '55500000-0000-0000-0000-000000000005' returning id$$,
  ARRAY[]::uuid[],
  'transfers — autre user (B) : ne peut pas supprimer le virement de A (0 ligne affectée)'
);

select * from finish();
rollback;
