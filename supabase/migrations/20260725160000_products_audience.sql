-- Derive prod jamais migree : colonne products.audience + contrainte
-- products_audience_check (filtre homme/femme/unisexe). Fonctionnalite
-- reelle, pas cosmetique -- recreee telle quelle depuis prod.

ALTER TABLE public.products ADD COLUMN IF NOT EXISTS audience text;

ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_audience_check;
ALTER TABLE public.products ADD CONSTRAINT products_audience_check
  CHECK (audience = ANY (ARRAY['men'::text, 'women'::text, 'unisex'::text, NULL::text]));
