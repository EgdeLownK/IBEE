-- product_media owner select
CREATE POLICY "product_media_owner_select"
  ON product_media FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM products p
      JOIN entity e ON e.id = p.entity_id
      WHERE p.id = product_id AND e.user_id = auth.uid()
    )
  );

-- product_variants owner select
CREATE POLICY "product_variants_owner_select"
  ON product_variants FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM products p
      JOIN entity e ON e.id = p.entity_id
      WHERE p.id = product_id AND e.user_id = auth.uid()
    )
  );
