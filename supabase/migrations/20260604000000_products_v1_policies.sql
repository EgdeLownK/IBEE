-- ============================================================
-- Migration: products_v1_policies
-- Policies RLS pour les 13 tables du catalogue produits.
-- Schéma source : 20260603120000_products_v1.sql
--
-- Modèle d'ownership :
--   vendeur = entity.user_id = auth.uid()
--   produit rattaché à une entity via products.entity_id
--
-- Postgres OR-e les policies permissives — une policy par
-- opération, pas de FOR ALL (convention repo).
-- ============================================================


-- ============================================================
-- 1. products
-- ============================================================

-- SELECT public : produits publiés uniquement (anon + authenticated)
CREATE POLICY "products_public_select"
  ON products FOR SELECT
  TO anon, authenticated
  USING (status = 'published');

-- SELECT owner : le vendeur voit tous ses produits (draft, published, archived)
CREATE POLICY "products_owner_select"
  ON products FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM entity WHERE id = entity_id AND user_id = auth.uid())
  );

-- INSERT owner
CREATE POLICY "products_owner_insert"
  ON products FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM entity WHERE id = entity_id AND user_id = auth.uid())
  );

-- UPDATE owner
CREATE POLICY "products_owner_update"
  ON products FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM entity WHERE id = entity_id AND user_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM entity WHERE id = entity_id AND user_id = auth.uid())
  );

-- DELETE owner
CREATE POLICY "products_owner_delete"
  ON products FOR DELETE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM entity WHERE id = entity_id AND user_id = auth.uid())
  );


-- ============================================================
-- 2. product_media
-- ============================================================

-- SELECT public : si le produit parent est published
CREATE POLICY "product_media_public_select"
  ON product_media FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (SELECT 1 FROM products WHERE id = product_id AND status = 'published')
  );

-- INSERT owner (jointure product_media → products → entity)
CREATE POLICY "product_media_owner_insert"
  ON product_media FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM products p
      JOIN entity e ON e.id = p.entity_id
      WHERE p.id = product_id AND e.user_id = auth.uid()
    )
  );

-- UPDATE owner
CREATE POLICY "product_media_owner_update"
  ON product_media FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM products p
      JOIN entity e ON e.id = p.entity_id
      WHERE p.id = product_id AND e.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM products p
      JOIN entity e ON e.id = p.entity_id
      WHERE p.id = product_id AND e.user_id = auth.uid()
    )
  );

-- DELETE owner
CREATE POLICY "product_media_owner_delete"
  ON product_media FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM products p
      JOIN entity e ON e.id = p.entity_id
      WHERE p.id = product_id AND e.user_id = auth.uid()
    )
  );


-- ============================================================
-- 3. product_slug_history
-- ============================================================

-- SELECT public : si le produit parent est published
-- (product_slug_history a entity_id directement, mais la
--  condition "publié" nécessite de joindre products)
CREATE POLICY "product_slug_history_public_select"
  ON product_slug_history FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (SELECT 1 FROM products WHERE id = product_id AND status = 'published')
  );

-- INSERT owner (entity_id disponible directement sur la table)
CREATE POLICY "product_slug_history_owner_insert"
  ON product_slug_history FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM entity WHERE id = entity_id AND user_id = auth.uid())
  );

-- UPDATE owner
CREATE POLICY "product_slug_history_owner_update"
  ON product_slug_history FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM entity WHERE id = entity_id AND user_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM entity WHERE id = entity_id AND user_id = auth.uid())
  );

-- DELETE owner
CREATE POLICY "product_slug_history_owner_delete"
  ON product_slug_history FOR DELETE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM entity WHERE id = entity_id AND user_id = auth.uid())
  );


-- ============================================================
-- 4. product_variants
-- ============================================================

-- SELECT public : si le produit parent est published
CREATE POLICY "product_variants_public_select"
  ON product_variants FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (SELECT 1 FROM products WHERE id = product_id AND status = 'published')
  );

-- INSERT owner
CREATE POLICY "product_variants_owner_insert"
  ON product_variants FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM products p
      JOIN entity e ON e.id = p.entity_id
      WHERE p.id = product_id AND e.user_id = auth.uid()
    )
  );

-- UPDATE owner
CREATE POLICY "product_variants_owner_update"
  ON product_variants FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM products p
      JOIN entity e ON e.id = p.entity_id
      WHERE p.id = product_id AND e.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM products p
      JOIN entity e ON e.id = p.entity_id
      WHERE p.id = product_id AND e.user_id = auth.uid()
    )
  );

-- DELETE owner
CREATE POLICY "product_variants_owner_delete"
  ON product_variants FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM products p
      JOIN entity e ON e.id = p.entity_id
      WHERE p.id = product_id AND e.user_id = auth.uid()
    )
  );


-- ============================================================
-- 5. product_reviews
-- ============================================================

-- SELECT public : avis publiés (anon + authenticated)
CREATE POLICY "product_reviews_public_select"
  ON product_reviews FOR SELECT
  TO anon, authenticated
  USING (status = 'published');

-- SELECT buyer : le buyer voit tous ses propres avis (tous statuts)
CREATE POLICY "product_reviews_buyer_select"
  ON product_reviews FOR SELECT
  TO authenticated
  USING (buyer_user_id = auth.uid());

-- INSERT buyer : uniquement l'acheteur avec son propre user_id.
-- NOTE : la vérification d'achat préalable (is_verified_purchase)
-- sera portée par la RPC submit_review (SECURITY DEFINER, phase
-- ultérieure). Cette policy n'a pas de référence à orders car la
-- table n'existe pas encore.
CREATE POLICY "product_reviews_buyer_insert"
  ON product_reviews FOR INSERT
  TO authenticated
  WITH CHECK (buyer_user_id = auth.uid());

-- UPDATE buyer : l'acheteur peut modifier son propre avis
CREATE POLICY "product_reviews_buyer_update"
  ON product_reviews FOR UPDATE
  TO authenticated
  USING (buyer_user_id = auth.uid())
  WITH CHECK (buyer_user_id = auth.uid());

-- SELECT owner : le vendeur voit tous les avis sur ses produits
-- (tous statuts) pour pouvoir les modérer depuis le dashboard
-- (client authentifié par cookies, pas de service_role).
CREATE POLICY "product_reviews_owner_select"
  ON product_reviews FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM products p
      JOIN entity e ON e.id = p.entity_id
      WHERE p.id = product_id AND e.user_id = auth.uid()
    )
  );

-- PAS de policy UPDATE owner : Postgres ne sait pas restreindre un
-- UPDATE à certaines colonnes via RLS — une policy owner_update
-- permettrait au vendeur de réécrire le contenu/la note d'un avis
-- client via l'API directe. La modération (changement de status)
-- passera par une RPC SECURITY DEFINER `moderate_product_review`
-- (phase RPC), conformément à la doctrine "écritures sensibles via
-- RPC SECURITY DEFINER".

-- DELETE buyer : seul l'acheteur peut supprimer son avis
CREATE POLICY "product_reviews_buyer_delete"
  ON product_reviews FOR DELETE
  TO authenticated
  USING (buyer_user_id = auth.uid());


-- ============================================================
-- 6. product_review_photos
-- ============================================================

-- SELECT public : si l'avis parent est published
CREATE POLICY "product_review_photos_public_select"
  ON product_review_photos FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (SELECT 1 FROM product_reviews WHERE id = review_id AND status = 'published')
  );

-- INSERT buyer : le propriétaire de l'avis
CREATE POLICY "product_review_photos_buyer_insert"
  ON product_review_photos FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM product_reviews WHERE id = review_id AND buyer_user_id = auth.uid())
  );

-- UPDATE buyer
CREATE POLICY "product_review_photos_buyer_update"
  ON product_review_photos FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM product_reviews WHERE id = review_id AND buyer_user_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM product_reviews WHERE id = review_id AND buyer_user_id = auth.uid())
  );

-- DELETE buyer
CREATE POLICY "product_review_photos_buyer_delete"
  ON product_review_photos FOR DELETE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM product_reviews WHERE id = review_id AND buyer_user_id = auth.uid())
  );


-- ============================================================
-- 7. product_questions
-- ============================================================

-- SELECT public : questions publiées
CREATE POLICY "product_questions_public_select"
  ON product_questions FOR SELECT
  TO anon, authenticated
  USING (status = 'published');

-- SELECT auteur : l'auteur voit ses propres questions (tous statuts)
-- Colonne auteur : asker_user_id (pas user_id)
CREATE POLICY "product_questions_author_select"
  ON product_questions FOR SELECT
  TO authenticated
  USING (asker_user_id = auth.uid());

-- INSERT authentifié : l'auteur doit renseigner son propre user_id
CREATE POLICY "product_questions_authenticated_insert"
  ON product_questions FOR INSERT
  TO authenticated
  WITH CHECK (asker_user_id = auth.uid());

-- SELECT owner : le vendeur voit toutes les questions sur ses
-- produits (tous statuts) pour modération depuis le dashboard.
CREATE POLICY "product_questions_owner_select"
  ON product_questions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM products p
      JOIN entity e ON e.id = p.entity_id
      WHERE p.id = product_id AND e.user_id = auth.uid()
    )
  );

-- PAS de policy UPDATE owner : même raison que product_reviews
-- (UPDATE full-row impossible à restreindre par colonne en RLS).
-- La modération du statut passera par une RPC SECURITY DEFINER
-- `moderate_product_question` (phase RPC).

-- DELETE auteur : l'auteur peut supprimer sa question
CREATE POLICY "product_questions_author_delete"
  ON product_questions FOR DELETE
  TO authenticated
  USING (asker_user_id = auth.uid());


-- ============================================================
-- 8. product_answers
-- ============================================================

-- SELECT public : réponses publiées
CREATE POLICY "product_answers_public_select"
  ON product_answers FOR SELECT
  TO anon, authenticated
  USING (status = 'published');

-- INSERT authentifié : l'auteur doit renseigner son propre user_id
-- Colonne auteur : answerer_user_id (pas user_id)
CREATE POLICY "product_answers_authenticated_insert"
  ON product_answers FOR INSERT
  TO authenticated
  WITH CHECK (answerer_user_id = auth.uid());

-- SELECT auteur : l'auteur voit ses propres réponses (tous statuts)
CREATE POLICY "product_answers_author_select"
  ON product_answers FOR SELECT
  TO authenticated
  USING (answerer_user_id = auth.uid());

-- SELECT owner : le vendeur voit toutes les réponses liées à ses
-- produits (tous statuts) pour modération depuis le dashboard
-- (jointure answers → questions → products → entity).
CREATE POLICY "product_answers_owner_select"
  ON product_answers FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM product_questions q
      JOIN products p ON p.id = q.product_id
      JOIN entity e ON e.id = p.entity_id
      WHERE q.id = question_id AND e.user_id = auth.uid()
    )
  );

-- PAS de policy UPDATE owner : même raison que product_reviews.
-- La modération du statut passera par une RPC SECURITY DEFINER
-- `moderate_product_answer` (phase RPC).

-- DELETE auteur : l'auteur peut supprimer sa réponse
CREATE POLICY "product_answers_author_delete"
  ON product_answers FOR DELETE
  TO authenticated
  USING (answerer_user_id = auth.uid());


-- ============================================================
-- 9. discount_codes
-- ============================================================
-- AUCUN accès public. Les codes ne doivent pas être énumérables
-- par les acheteurs. La validation passe par une RPC SECURITY
-- DEFINER (apply_discount_code, phase ultérieure).

-- SELECT owner uniquement
CREATE POLICY "discount_codes_owner_select"
  ON discount_codes FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM entity WHERE id = entity_id AND user_id = auth.uid())
  );

-- INSERT owner
CREATE POLICY "discount_codes_owner_insert"
  ON discount_codes FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM entity WHERE id = entity_id AND user_id = auth.uid())
  );

-- UPDATE owner
CREATE POLICY "discount_codes_owner_update"
  ON discount_codes FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM entity WHERE id = entity_id AND user_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM entity WHERE id = entity_id AND user_id = auth.uid())
  );

-- DELETE owner
CREATE POLICY "discount_codes_owner_delete"
  ON discount_codes FOR DELETE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM entity WHERE id = entity_id AND user_id = auth.uid())
  );


-- ============================================================
-- 10. discount_code_products
-- ============================================================
-- Jonction discount_codes ↔ products (applies_to=specific_products).
-- CRUD owner uniquement : jointure vers discount_codes → entity.

-- SELECT owner
CREATE POLICY "discount_code_products_owner_select"
  ON discount_code_products FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM discount_codes dc
      JOIN entity e ON e.id = dc.entity_id
      WHERE dc.id = code_id AND e.user_id = auth.uid()
    )
  );

-- INSERT owner
CREATE POLICY "discount_code_products_owner_insert"
  ON discount_code_products FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM discount_codes dc
      JOIN entity e ON e.id = dc.entity_id
      WHERE dc.id = code_id AND e.user_id = auth.uid()
    )
  );

-- UPDATE owner (peu probable sur une table de jonction PK composite,
-- mais couvert par cohérence)
CREATE POLICY "discount_code_products_owner_update"
  ON discount_code_products FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM discount_codes dc
      JOIN entity e ON e.id = dc.entity_id
      WHERE dc.id = code_id AND e.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM discount_codes dc
      JOIN entity e ON e.id = dc.entity_id
      WHERE dc.id = code_id AND e.user_id = auth.uid()
    )
  );

-- DELETE owner
CREATE POLICY "discount_code_products_owner_delete"
  ON discount_code_products FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM discount_codes dc
      JOIN entity e ON e.id = dc.entity_id
      WHERE dc.id = code_id AND e.user_id = auth.uid()
    )
  );


-- ============================================================
-- 11. discount_code_categories
-- ============================================================
-- Jonction discount_codes ↔ catégories (applies_to=specific_categories).
-- CRUD owner uniquement : même pattern que discount_code_products.

-- SELECT owner
CREATE POLICY "discount_code_categories_owner_select"
  ON discount_code_categories FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM discount_codes dc
      JOIN entity e ON e.id = dc.entity_id
      WHERE dc.id = code_id AND e.user_id = auth.uid()
    )
  );

-- INSERT owner
CREATE POLICY "discount_code_categories_owner_insert"
  ON discount_code_categories FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM discount_codes dc
      JOIN entity e ON e.id = dc.entity_id
      WHERE dc.id = code_id AND e.user_id = auth.uid()
    )
  );

-- UPDATE owner
CREATE POLICY "discount_code_categories_owner_update"
  ON discount_code_categories FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM discount_codes dc
      JOIN entity e ON e.id = dc.entity_id
      WHERE dc.id = code_id AND e.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM discount_codes dc
      JOIN entity e ON e.id = dc.entity_id
      WHERE dc.id = code_id AND e.user_id = auth.uid()
    )
  );

-- DELETE owner
CREATE POLICY "discount_code_categories_owner_delete"
  ON discount_code_categories FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM discount_codes dc
      JOIN entity e ON e.id = dc.entity_id
      WHERE dc.id = code_id AND e.user_id = auth.uid()
    )
  );


-- ============================================================
-- 12. discount_code_uses
-- ============================================================
-- Pas d'INSERT/UPDATE/DELETE client : les insertions sont faites
-- exclusivement via RPC apply_discount_code (SECURITY DEFINER,
-- phase ultérieure). RLS bloque tout autre accès par défaut.

-- SELECT owner de l'entity du code
CREATE POLICY "discount_code_uses_owner_select"
  ON discount_code_uses FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM discount_codes dc
      JOIN entity e ON e.id = dc.entity_id
      WHERE dc.id = code_id AND e.user_id = auth.uid()
    )
  );

-- SELECT user concerné : voit ses propres utilisations
CREATE POLICY "discount_code_uses_self_select"
  ON discount_code_uses FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());


-- ============================================================
-- 13. wishlist_items
-- ============================================================
-- CRUD complet par l'utilisateur propriétaire uniquement.
-- Aucun accès public, aucun accès cross-user.

-- SELECT self
CREATE POLICY "wishlist_items_self_select"
  ON wishlist_items FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- INSERT self
CREATE POLICY "wishlist_items_self_insert"
  ON wishlist_items FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- UPDATE self
CREATE POLICY "wishlist_items_self_update"
  ON wishlist_items FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- DELETE self
CREATE POLICY "wishlist_items_self_delete"
  ON wishlist_items FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());
