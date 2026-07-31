-- Date de fin optionnelle sur une offre d'emploi (ex. date limite de
-- candidature). Colonne nullable, sans defaut, sans contrainte NOT NULL :
-- toutes les offres existantes restent valides sans modification.
--
-- VOLONTAIRE : aucune depublication automatique a echeance n'est
-- implementee ici (ni trigger, ni job cron, ni filtre applicatif) -- hors
-- perimetre de cette migration, a construire seulement si le besoin se
-- confirme. Une offre dont end_date est passee reste "active" tant que son
-- statut n'est pas change manuellement.
ALTER TABLE public.entity_job_offers
  ADD COLUMN end_date date;
