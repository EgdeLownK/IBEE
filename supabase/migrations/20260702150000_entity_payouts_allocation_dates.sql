-- =============================================================================
-- Ajout des dates de validité sur les allocations de virements
-- =============================================================================

ALTER TABLE entity_payout_allocations
  ADD COLUMN start_date date NOT NULL DEFAULT CURRENT_DATE,
  ADD COLUMN end_date date;

-- Vérification de cohérence (optionnel, mais utile : end_date >= start_date)
ALTER TABLE entity_payout_allocations
  ADD CONSTRAINT entity_payout_allocations_dates_check
  CHECK (end_date IS NULL OR end_date >= start_date);
