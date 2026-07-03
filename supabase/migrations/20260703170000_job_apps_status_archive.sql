-- 1. Mise à jour des valeurs de l'enum des statuts
ALTER TYPE entity_job_application_status RENAME VALUE 'reviewed' TO 'shortlisted';
ALTER TYPE entity_job_application_status RENAME VALUE 'accepted' TO 'hired';

-- Ajout d'une nouvelle valeur pour la phase rencontre
ALTER TYPE entity_job_application_status ADD VALUE IF NOT EXISTS 'interviewing' AFTER 'shortlisted';

-- 2. Ajout de la colonne pour l'historisation (archives)
ALTER TABLE entity_job_applications ADD COLUMN IF NOT EXISTS is_archived boolean NOT NULL DEFAULT false;

-- Notification à PostgREST pour recharger le cache du schéma
NOTIFY pgrst, 'reload schema';
