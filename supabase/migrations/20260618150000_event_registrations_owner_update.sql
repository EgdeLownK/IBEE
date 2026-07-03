-- Billetterie Activité : owner peut annuler une inscription

CREATE POLICY "event_registrations_owner_update"
  ON event_registrations FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM entity WHERE id = entity_id AND user_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM entity WHERE id = entity_id AND user_id = auth.uid())
  );
