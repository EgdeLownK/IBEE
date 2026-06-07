-- ============================================================
-- Migration: service_reviews_faq
-- Avis + FAQ pour les services (décisions Killian 2026-06-06),
-- miroir du pattern produits :
--   1. appointment_types.faq — FAQ rédigée par le vendeur
--      (étape 3 de l'overlay service)
--   2. service_reviews — avis clients sur les services.
--      Affichage en lecture seule pour l'instant : le dépôt
--      d'avis viendra avec l'historique de réservations/commandes.
-- ============================================================

-- ============================================================
-- 1. FAQ service (array de {question, answer} — longueurs validées
--    côté API, le CHECK garantit la forme tableau)
-- ============================================================
ALTER TABLE appointment_types
  ADD COLUMN faq jsonb NOT NULL DEFAULT '[]'::jsonb
  CHECK (jsonb_typeof(faq) = 'array');

COMMENT ON COLUMN appointment_types.faq IS 'FAQ rédigée par le vendeur : array de {question ≤200, answer ≤1000}, max 10 entrées (validé côté API).';

-- ============================================================
-- 2. Table service_reviews (miroir de product_reviews —
--    réutilise l'enum product_review_status)
-- ============================================================
CREATE TABLE service_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_type_id uuid NOT NULL REFERENCES appointment_types(id) ON DELETE CASCADE,
  entity_id uuid NOT NULL REFERENCES entity(id) ON DELETE CASCADE,
  buyer_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  booking_id uuid REFERENCES bookings(id) ON DELETE SET NULL,
  rating smallint NOT NULL CHECK (rating BETWEEN 1 AND 5),
  title text CHECK (title IS NULL OR char_length(title) <= 80),
  content text NOT NULL CHECK (char_length(content) >= 20),
  status product_review_status NOT NULL DEFAULT 'pending',
  is_verified_purchase boolean NOT NULL DEFAULT false,
  seller_reply text,
  seller_replied_at timestamptz,
  helpful_count integer NOT NULL DEFAULT 0 CHECK (helpful_count >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  moderated_at timestamptz,

  -- Un seul avis par couple (service, buyer)
  CONSTRAINT service_reviews_unique_per_buyer UNIQUE (appointment_type_id, buyer_user_id)
);

COMMENT ON TABLE service_reviews IS 'Avis clients sur les services (1–5 étoiles + texte). is_verified_purchase à true si le client a une réservation honorée.';

CREATE INDEX idx_service_reviews_type_status ON service_reviews (appointment_type_id, status);
CREATE INDEX idx_service_reviews_buyer ON service_reviews (buyer_user_id);

CREATE TRIGGER trg_service_reviews_updated_at
  BEFORE UPDATE ON service_reviews
  FOR EACH ROW EXECUTE FUNCTION trg_product_reviews_set_updated_at();

-- ============================================================
-- 3. RLS (miroir des policies product_reviews)
-- ============================================================
ALTER TABLE service_reviews ENABLE ROW LEVEL SECURITY;

-- SELECT public : avis publiés (anon + authenticated)
CREATE POLICY "service_reviews_public_select"
  ON service_reviews FOR SELECT
  TO anon, authenticated
  USING (status = 'published');

-- SELECT buyer : le client voit tous ses propres avis (tous statuts)
CREATE POLICY "service_reviews_buyer_select"
  ON service_reviews FOR SELECT
  TO authenticated
  USING (buyer_user_id = auth.uid());

-- INSERT buyer : uniquement le client avec son propre user_id.
-- NOTE : la vérification de réservation préalable (is_verified_purchase)
-- sera portée par une RPC SECURITY DEFINER quand le dépôt d'avis
-- ouvrira (depuis l'historique de réservations).
CREATE POLICY "service_reviews_buyer_insert"
  ON service_reviews FOR INSERT
  TO authenticated
  WITH CHECK (buyer_user_id = auth.uid());

-- UPDATE buyer : le client peut modifier son propre avis
CREATE POLICY "service_reviews_buyer_update"
  ON service_reviews FOR UPDATE
  TO authenticated
  USING (buyer_user_id = auth.uid())
  WITH CHECK (buyer_user_id = auth.uid());

-- SELECT owner : le vendeur voit tous les avis sur ses services
-- (tous statuts) pour modération (client authentifié, pas de service_role)
CREATE POLICY "service_reviews_owner_select"
  ON service_reviews FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM entity e
      WHERE e.id = entity_id AND e.user_id = auth.uid()
    )
  );

-- PAS de policy UPDATE owner : même doctrine que product_reviews
-- (UPDATE full-row impossible à restreindre par colonne en RLS).
-- La modération du statut passera par une RPC SECURITY DEFINER.

-- DELETE buyer : seul le client peut supprimer son avis
CREATE POLICY "service_reviews_buyer_delete"
  ON service_reviews FOR DELETE
  TO authenticated
  USING (buyer_user_id = auth.uid());
