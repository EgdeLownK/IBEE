-- Ajout des colonnes pour les profils et analyses des candidatures
ALTER TABLE entity_job_applications
  ADD COLUMN location text,
  ADD COLUMN experience_years integer,
  ADD COLUMN education_level text,
  ADD COLUMN skills text[];

-- Notification à PostgREST pour recharger le cache du schéma
NOTIFY pgrst, 'reload schema';
