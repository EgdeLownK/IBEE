-- Derive prod jamais migree : pg_cron + le job "publish-scheduled" (toutes
-- les minutes, auto-publie les publications programmees) sont actifs en
-- prod, mais la migration d'origine (20260412200000_publications_notifications_system.sql
-- §11) les laisse explicitement en commentaire ("Uncomment after enabling
-- pg_cron in Supabase dashboard"). Quelqu'un a active l'extension via le
-- dashboard et cree le job a la main sans jamais decommenter la migration.
--
-- Garde conditionnelle : pg_cron necessite shared_preload_libraries au niveau
-- serveur (pas quelque chose qu'une migration peut poser retroactivement).
-- Verifie present en local (CLI Supabase) et en prod. Le bloc n'echoue pas
-- silencieusement en prod : le IF NOT EXISTS saute directement a la
-- planification du job sans jamais passer par le bloc CREATE EXTENSION
-- (l'extension y existe deja), donc une vraie erreur prod resterait visible.
-- Le EXCEPTION ne peut se declencher que sur un environnement ou l'extension
-- n'existe pas encore et n'est pas chargeable (typiquement un Postgres nu
-- hors stack Supabase) -- non bloquant pour ce cas-la uniquement.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    BEGIN
      CREATE EXTENSION pg_cron;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'pg_cron indisponible sur cet environnement (shared_preload_libraries ?) - job "publish-scheduled" non planifie : %', SQLERRM;
      RETURN;
    END;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'publish-scheduled') THEN
    PERFORM cron.schedule(
      'publish-scheduled',
      '* * * * *',
      $cron$
        UPDATE public.publications
        SET status = 'published', published_at = scheduled_for, scheduled_for = NULL
        WHERE status = 'scheduled' AND scheduled_for <= now();
      $cron$
    );
  END IF;
END $$;
