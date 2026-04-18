-- =============================================================================
-- Policies RLS owner INSERT / UPDATE / DELETE sur les 4 tables enfants
-- Condition commune : auth.uid() = entity.user_id via entity_id FK
-- =============================================================================

-- -----------------------------------------------------------------------------
-- entity_menu_sections
-- -----------------------------------------------------------------------------

CREATE POLICY "entity_menu_sections_owner_insert"
  ON entity_menu_sections FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM entity WHERE id = entity_id AND user_id = auth.uid())
  );

CREATE POLICY "entity_menu_sections_owner_update"
  ON entity_menu_sections FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM entity WHERE id = entity_id AND user_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM entity WHERE id = entity_id AND user_id = auth.uid())
  );

CREATE POLICY "entity_menu_sections_owner_delete"
  ON entity_menu_sections FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM entity WHERE id = entity_id AND user_id = auth.uid())
  );

-- -----------------------------------------------------------------------------
-- entity_home_widgets
-- -----------------------------------------------------------------------------

CREATE POLICY "entity_home_widgets_owner_insert"
  ON entity_home_widgets FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM entity WHERE id = entity_id AND user_id = auth.uid())
  );

CREATE POLICY "entity_home_widgets_owner_update"
  ON entity_home_widgets FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM entity WHERE id = entity_id AND user_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM entity WHERE id = entity_id AND user_id = auth.uid())
  );

CREATE POLICY "entity_home_widgets_owner_delete"
  ON entity_home_widgets FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM entity WHERE id = entity_id AND user_id = auth.uid())
  );

-- -----------------------------------------------------------------------------
-- entity_global_features
-- -----------------------------------------------------------------------------

CREATE POLICY "entity_global_features_owner_insert"
  ON entity_global_features FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM entity WHERE id = entity_id AND user_id = auth.uid())
  );

CREATE POLICY "entity_global_features_owner_update"
  ON entity_global_features FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM entity WHERE id = entity_id AND user_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM entity WHERE id = entity_id AND user_id = auth.uid())
  );

CREATE POLICY "entity_global_features_owner_delete"
  ON entity_global_features FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM entity WHERE id = entity_id AND user_id = auth.uid())
  );

-- -----------------------------------------------------------------------------
-- entity_faq_items
-- -----------------------------------------------------------------------------

CREATE POLICY "entity_faq_items_owner_insert"
  ON entity_faq_items FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM entity WHERE id = entity_id AND user_id = auth.uid())
  );

CREATE POLICY "entity_faq_items_owner_update"
  ON entity_faq_items FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM entity WHERE id = entity_id AND user_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM entity WHERE id = entity_id AND user_id = auth.uid())
  );

CREATE POLICY "entity_faq_items_owner_delete"
  ON entity_faq_items FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM entity WHERE id = entity_id AND user_id = auth.uid())
  );
