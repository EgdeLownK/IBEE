-- =============================================================================
-- Migration: entity_job_offers_v2
-- Ajoute la gestion des blocs (description) et la rémunération complexe
-- =============================================================================

CREATE TYPE entity_job_comp_type AS ENUM ('fixed', 'percentage');
CREATE TYPE entity_job_comp_freq AS ENUM ('weekly', 'monthly', 'mission');

ALTER TABLE entity_job_offers
  ADD COLUMN blocks jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN compensation_type entity_job_comp_type,
  ADD COLUMN compensation_amount numeric,
  ADD COLUMN compensation_frequency entity_job_comp_freq;

COMMENT ON COLUMN entity_job_offers.blocks IS 'Description sous forme de blocs ordonnés : [{ type: "text", content }, { type: "image", url, alt? }]';

-- Migration de l'ancienne description texte vers les blocs (au cas où il y a déjà des données)
UPDATE entity_job_offers
SET blocks = jsonb_build_array(jsonb_build_object('type', 'text', 'content', description))
WHERE description IS NOT NULL AND btrim(description) <> '';

-- Supprimer les anciennes colonnes
ALTER TABLE entity_job_offers
  DROP COLUMN description,
  DROP COLUMN compensation;
