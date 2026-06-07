-- ============================================================
-- Migration: products_faq_custom_details
-- Évolutions page produit (décisions Killian 2026-06-05) :
--   1. faq            — FAQ rédigée par le vendeur (étape 3 du
--      formulaire, physique ET digital). Remplace le Q&A public
--      côté affichage ; la table product_questions reste utilisée
--      en privé (« Poser une question au vendeur »).
--   2. custom_details — détails libres clé/valeur du produit
--      digital (étape 2). Remplace le select Licence dans le
--      formulaire ; la colonne digital_license est conservée
--      mais dépréciée (lisible pour les anciens produits).
-- ============================================================

-- ============================================================
-- 1. FAQ produit (array de {question, answer} — longueurs validées
--    côté API, le CHECK garantit la forme tableau)
-- ============================================================
ALTER TABLE products
  ADD COLUMN faq jsonb NOT NULL DEFAULT '[]'::jsonb
  CHECK (jsonb_typeof(faq) = 'array');

COMMENT ON COLUMN products.faq IS 'FAQ rédigée par le vendeur : array de {question ≤200, answer ≤1000}, max 10 entrées (validé côté API).';

-- ============================================================
-- 2. Détails personnalisés (array de {label, value} — longueurs
--    validées côté API, le CHECK garantit la forme tableau)
-- ============================================================
ALTER TABLE products
  ADD COLUMN custom_details jsonb NOT NULL DEFAULT '[]'::jsonb
  CHECK (jsonb_typeof(custom_details) = 'array');

COMMENT ON COLUMN products.custom_details IS 'Détails libres clé/valeur (digital) : array de {label ≤40, value ≤100}, max 8 entrées (validé côté API).';

-- ============================================================
-- 3. Licence dépréciée côté formulaire (colonne conservée pour
--    l''affichage des anciens produits)
-- ============================================================
COMMENT ON COLUMN products.digital_license IS 'DÉPRÉCIÉE — remplacée par custom_details (détails libres). Conservée pour l''affichage des produits existants.';
