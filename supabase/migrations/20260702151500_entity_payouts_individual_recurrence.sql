-- =============================================================================
-- Migration pour individualiser la récurrence des virements par membre
-- =============================================================================

ALTER TABLE entity_payout_allocations
  ADD COLUMN recurrence entity_payout_recurrence NOT NULL DEFAULT 'monthly',
  ADD COLUMN last_run_at timestamptz,
  ADD COLUMN next_run_at timestamptz;

-- Initialiser next_run_at pour les allocations existantes à partir du schedule parent
UPDATE entity_payout_allocations a
SET 
  recurrence = s.recurrence,
  next_run_at = s.next_run_at,
  last_run_at = s.last_run_at
FROM entity_payout_schedules s
WHERE a.schedule_id = s.id;

-- Rendre next_run_at NOT NULL après l'initialisation
ALTER TABLE entity_payout_allocations
  ALTER COLUMN next_run_at SET NOT NULL;

-- Création d'un index pour optimiser le cron
CREATE INDEX idx_entity_payout_allocations_next_run
  ON entity_payout_allocations (next_run_at);

-- Optionnel: On pourrait supprimer les colonnes de entity_payout_schedules
-- mais pour éviter de casser le code existant qui n'est pas encore migré,
-- on les garde pour le moment ou on les laisse inactives.
