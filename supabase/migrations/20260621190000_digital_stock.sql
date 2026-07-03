-- ============================================================
-- Migration: digital_stock
-- Stock limité optionnel pour produits digitaux (licences).
-- Par défaut : ventes illimitées (comportement existant).
-- ============================================================

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS digital_stock_quantity integer
    CHECK (digital_stock_quantity IS NULL OR digital_stock_quantity >= 0),
  ADD COLUMN IF NOT EXISTS digital_stock_unlimited boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN products.digital_stock_quantity IS
  'Stock digital (licences). Ignoré si digital_stock_unlimited = true.';
COMMENT ON COLUMN products.digital_stock_unlimited IS
  'true = ventes digitales illimitées (défaut). false = plafond via digital_stock_quantity.';

CREATE OR REPLACE FUNCTION assert_product_in_stock(
  p_product products,
  p_variant product_variants,
  p_quantity integer
) RETURNS void AS $$
BEGIN
  IF p_product.type = 'digital' THEN
    IF COALESCE(p_product.digital_stock_unlimited, true) THEN
      RETURN;
    END IF;

    IF COALESCE(p_product.digital_stock_quantity, 0) < p_quantity THEN
      RAISE EXCEPTION 'stock_insufficient' USING ERRCODE = 'P0001';
    END IF;
    RETURN;
  END IF;

  IF p_variant IS NOT NULL THEN
    IF p_variant.stock_quantity < p_quantity THEN
      RAISE EXCEPTION 'stock_insufficient' USING ERRCODE = 'P0001';
    END IF;
    RETURN;
  END IF;

  IF COALESCE(p_product.physical_stock_unlimited, false) THEN
    RETURN;
  END IF;

  IF COALESCE(p_product.physical_stock_quantity, 0) < p_quantity THEN
    RAISE EXCEPTION 'stock_insufficient' USING ERRCODE = 'P0001';
  END IF;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION decrement_stock_for_line(
  p_product products,
  p_variant_id uuid,
  p_quantity integer
) RETURNS void AS $$
BEGIN
  IF p_product.type = 'digital' THEN
    IF COALESCE(p_product.digital_stock_unlimited, true) THEN
      RETURN;
    END IF;

    UPDATE products
    SET digital_stock_quantity = digital_stock_quantity - p_quantity
    WHERE id = p_product.id
      AND digital_stock_quantity >= p_quantity;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'stock_decrement_failed' USING ERRCODE = 'P0001';
    END IF;
    RETURN;
  END IF;

  IF p_variant_id IS NOT NULL THEN
    UPDATE product_variants
    SET stock_quantity = stock_quantity - p_quantity
    WHERE id = p_variant_id
      AND stock_quantity >= p_quantity;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'stock_decrement_failed' USING ERRCODE = 'P0001';
    END IF;
    RETURN;
  END IF;

  IF COALESCE(p_product.physical_stock_unlimited, false) THEN
    RETURN;
  END IF;

  UPDATE products
  SET physical_stock_quantity = physical_stock_quantity - p_quantity
  WHERE id = p_product.id
    AND physical_stock_quantity >= p_quantity;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'stock_decrement_failed' USING ERRCODE = 'P0001';
  END IF;
END;
$$ LANGUAGE plpgsql;
