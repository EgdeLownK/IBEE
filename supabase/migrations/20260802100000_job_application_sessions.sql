-- Notion de session (vague de recrutement) sur les candidatures.
-- Aujourd'hui, quand une offre hors ligne repasse en ligne
-- (updateJobOfferAction, apps/platform/src/app/dashboard/talent/talent-actions.ts),
-- toutes les candidatures actives sont archivées d'un coup via le seul
-- booleen is_archived : si l'offre est relancee plusieurs fois, les vagues
-- se melangent dans un unique sac "archive", impossibles a distinguer.
--
-- session_count (entity_job_offers) : compteur de vagues de l'offre, a
-- incrementer par le code applicatif a chaque remise en ligne (hors scope
-- de cette migration, qui ne modifie aucun code).
-- session_number (entity_job_applications) : numero de vague fige a la
-- creation de la candidature, copie de session_count de l'offre au moment
-- du depot.
--
-- Backfill : au 2026-08-02, 0 candidature archivee en production (verifie
-- par SELECT avant redaction de cette migration) - DEFAULT 1 suffit donc
-- pour toutes les lignes existantes, sans reconstitution d'historique.

ALTER TABLE entity_job_offers
  ADD COLUMN IF NOT EXISTS session_count integer NOT NULL DEFAULT 1
    CHECK (session_count >= 1);

ALTER TABLE entity_job_applications
  ADD COLUMN IF NOT EXISTS session_number integer NOT NULL DEFAULT 1
    CHECK (session_number >= 1);

-- Filtrage futur "candidats de la session N d'une offre" : evite un scan
-- complet sur les offres a fort volume de candidatures.
CREATE INDEX IF NOT EXISTS idx_entity_job_apps_offer_session
  ON entity_job_applications (offer_id, session_number);

NOTIFY pgrst, 'reload schema';
