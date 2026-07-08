-- Add promotional pricing to variants
ALTER TABLE product_variants
ADD COLUMN sale_price_cents_override integer CHECK (sale_price_cents_override IS NULL OR sale_price_cents_override >= 0),
ADD COLUMN sale_ends_at timestamptz;
