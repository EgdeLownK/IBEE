-- Extension des types de contrat (recrutement) + statut cadre.
--
-- VOLONTAIRE : ADD VALUE et ADD COLUMN cohabitent dans le meme fichier sans
-- risque -- aucune instruction ici ne lit/compare/assigne une des 4 nouvelles
-- valeurs d'enum (pas d'UPDATE, pas de DEFAULT, pas de CHECK qui la
-- referencerait). C'est cette absence d'usage qui rend une transaction
-- unique sure : Postgres interdit seulement d'UTILISER une valeur d'enum
-- ajoutee par ALTER TYPE ... ADD VALUE avant que cet ADD VALUE soit commit,
-- pas de l'ajouter. Si un futur changement ajoute ici un UPDATE/CHECK/DEFAULT
-- portant sur interim/contrat_pro/apprentissage/stage, le sortir dans un
-- fichier de migration separe, apres celui-ci.
ALTER TYPE entity_job_contract_type ADD VALUE IF NOT EXISTS 'interim';
ALTER TYPE entity_job_contract_type ADD VALUE IF NOT EXISTS 'contrat_pro';
ALTER TYPE entity_job_contract_type ADD VALUE IF NOT EXISTS 'apprentissage';
ALTER TYPE entity_job_contract_type ADD VALUE IF NOT EXISTS 'stage';

-- Statut cadre : nullable, sans defaut -- les offres existantes restent
-- valides sans modification (meme motif que end_date, voir
-- 20260731100000_job_offers_end_date.sql). Pertinent seulement pour cdi/cdd/
-- interim (masque ailleurs cote formulaire) ; pas de CHECK contraignant les
-- autres types a NULL ici -- rien n'empeche une donnee existante ou saisie
-- via un autre canal, la contrainte reste purement une regle d'UI.
ALTER TABLE public.entity_job_offers
  ADD COLUMN is_cadre boolean;

NOTIFY pgrst, 'reload schema';
