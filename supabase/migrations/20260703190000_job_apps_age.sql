ALTER TABLE entity_job_applications ADD COLUMN IF NOT EXISTS age integer;

-- Notification à PostgREST pour recharger le cache du schéma
NOTIFY pgrst, 'reload schema';
