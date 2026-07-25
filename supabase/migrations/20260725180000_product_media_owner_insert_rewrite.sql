-- Ecart cosmetique trouve en prod : product_media_owner_insert a ete
-- reecrite (IN au lieu d'EXISTS), strictement equivalente fonctionnellement.
-- Alignee ici pour une empreinte de schema identique -- pas de changement de
-- comportement, juste la version prod capturee telle quelle.

ALTER POLICY "product_media_owner_insert" ON public.product_media
  WITH CHECK (
    product_id IN (
      SELECT p.id FROM products p JOIN entity e ON e.id = p.entity_id
      WHERE e.user_id = auth.uid()
    )
  );
