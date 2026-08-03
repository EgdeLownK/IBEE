-- Preuve dans les deux sens pour `job_sectors` (20260804100000_job_sectors.sql) :
--   a) un visiteur ANONYME peut LIRE la table (formulaire/affichage public).
--   b) un utilisateur AUTHENTIFIE ne peut RIEN y ecrire (insert/update/delete
--      tous refuses) -- table de reference geree uniquement par migration.
-- Pas de fixture entity/team ici : job_sectors est une table globale, sans
-- entity_id, deja peuplee par les 20 valeurs initiales de la migration.
begin;
create extension if not exists pgtap with schema extensions;

select plan(9);

-- ============================================================
-- Cas 1 : anonyme -- lecture OK, ecriture refusee.
-- ============================================================
set local role anon;

select results_eq(
  $$select count(*)::int from public.job_sectors$$,
  ARRAY[20],
  'anonyme : lit les 20 secteurs seedes par la migration'
);

select results_eq(
  $$select slug from public.job_sectors order by display_order desc limit 1$$,
  ARRAY['autre'],
  'anonyme : "autre" apparait bien en dernier (display_order max)'
);

select throws_ok(
  $$insert into public.job_sectors (slug, label) values ('hack', 'Hack')$$,
  '42501',
  'new row violates row-level security policy for table "job_sectors"',
  'anonyme : ne peut pas ajouter de secteur'
);

select results_eq(
  $$update public.job_sectors set label = 'hack' where slug = 'autre' returning id$$,
  ARRAY[]::uuid[],
  'anonyme : ne peut pas modifier un secteur (0 ligne affectee)'
);

select results_eq(
  $$delete from public.job_sectors where slug = 'autre' returning id$$,
  ARRAY[]::uuid[],
  'anonyme : ne peut pas supprimer un secteur (0 ligne affectee)'
);

-- ============================================================
-- Cas 2 : authentifie -- lecture OK, ecriture refusee (meme sans lien avec
-- une entite : job_sectors n'est scopee par aucun mecanisme d'appartenance).
-- ============================================================
set local role authenticated;
set local request.jwt.claim.sub = 'c0000000-0000-0000-0000-000000000005';

select results_eq(
  $$select count(*)::int from public.job_sectors$$,
  ARRAY[20],
  'authentifie : lit les 20 secteurs seedes par la migration'
);

select throws_ok(
  $$insert into public.job_sectors (slug, label) values ('hack', 'Hack')$$,
  '42501',
  'new row violates row-level security policy for table "job_sectors"',
  'authentifie : ne peut pas ajouter de secteur'
);

select results_eq(
  $$update public.job_sectors set label = 'hack' where slug = 'autre' returning id$$,
  ARRAY[]::uuid[],
  'authentifie : ne peut pas modifier un secteur (0 ligne affectee)'
);

select results_eq(
  $$delete from public.job_sectors where slug = 'autre' returning id$$,
  ARRAY[]::uuid[],
  'authentifie : ne peut pas supprimer un secteur (0 ligne affectee)'
);

select * from finish();
rollback;
