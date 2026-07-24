-- Tests RLS pour `notifications` : chaque destinataire ne voit/ne modifie que
-- ses propres notifications. 3 cas testés : owner (destinataire), autre
-- utilisateur authentifié, anonyme.
begin;
create extension if not exists pgtap with schema extensions;

select plan(6);

-- notifications.recipient_user_id référence auth.users (FK) : insérer les
-- utilisateurs de test d'abord (déclenche on_auth_user_created, sans impact
-- ici puisque ce test ne touche pas à la table entity).
insert into auth.users (id, email) values
  ('a0000000-0000-0000-0000-00000000000a', 'test-notif-a@test.local'),
  ('b0000000-0000-0000-0000-00000000000b', 'test-notif-b@test.local');

insert into public.notifications (id, recipient_user_id, type) values
  ('11100000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-00000000000a', 'new_follower'),
  ('22200000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-00000000000b', 'new_follower');

-- Cas 1 : anonyme.
set local role anon;

select results_eq(
  $$select count(*) from public.notifications$$,
  ARRAY[0::bigint],
  'anonyme : ne lit aucune notification'
);

-- Cas 2 : destinataire (A).
set local role authenticated;
set local request.jwt.claim.sub = 'a0000000-0000-0000-0000-00000000000a';

select results_eq(
  $$select id from public.notifications order by id$$,
  ARRAY['11100000-0000-0000-0000-000000000001'::uuid],
  'destinataire (A) : ne voit que sa propre notification'
);

select lives_ok(
  $$update public.notifications set read_at = now() where id = '11100000-0000-0000-0000-000000000001'$$,
  'destinataire (A) : peut marquer sa notification comme lue'
);

select throws_ok(
  $$insert into public.notifications (recipient_user_id, type) values ('a0000000-0000-0000-0000-00000000000a', 'new_follower')$$,
  '42501',
  'destinataire (A) : ne peut pas créer de notification directement (aucune policy INSERT — système seul)'
);

-- Cas 3 : autre utilisateur authentifié (B) tente sur la notification de A.
set local request.jwt.claim.sub = 'b0000000-0000-0000-0000-00000000000b';

select results_eq(
  $$update public.notifications set read_at = now() where id = '11100000-0000-0000-0000-000000000001' returning id$$,
  ARRAY[]::uuid[],
  'autre user (B) : ne peut pas marquer la notification de A comme lue (0 ligne affectée)'
);

select results_eq(
  $$select id from public.notifications order by id$$,
  ARRAY['22200000-0000-0000-0000-000000000002'::uuid],
  'autre user (B) : ne voit que sa propre notification, jamais celle de A'
);

select * from finish();
rollback;
