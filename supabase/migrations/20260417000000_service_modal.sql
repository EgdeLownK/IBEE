-- Service creation modal: extend appointment_types + create service-images bucket
-- Adds rich content fields (gallery, highlights, promo price, content blocks)
-- and a dedicated Storage bucket with owner-scoped RLS.

-- 1. Extend appointment_types with rich content fields
ALTER TABLE appointment_types
  ADD COLUMN highlights JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN gallery_images TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN promo_price_cents INT NULL,
  ADD COLUMN content_blocks JSONB NOT NULL DEFAULT '[]'::jsonb;

-- Promo price must be strictly positive and less than price_cents
ALTER TABLE appointment_types
  ADD CONSTRAINT appointment_types_promo_price_check
  CHECK (
    promo_price_cents IS NULL
    OR (price_cents IS NOT NULL AND promo_price_cents > 0 AND promo_price_cents < price_cents)
  );

COMMENT ON COLUMN appointment_types.highlights IS 'Array of up to 4 key selling points (strings)';
COMMENT ON COLUMN appointment_types.gallery_images IS 'Gallery image URLs; first = cover';
COMMENT ON COLUMN appointment_types.promo_price_cents IS 'Optional discounted price; must be < price_cents';
COMMENT ON COLUMN appointment_types.content_blocks IS 'Rich content: array of {type: text|image|list, ...}';

-- 2. Service images bucket (public read, owner-only write via path prefix)
INSERT INTO storage.buckets (id, name, public)
VALUES ('service-images', 'service-images', true)
ON CONFLICT (id) DO NOTHING;

-- Path convention: <entity_id>/<uuid>/<filename>
-- The first folder segment must match one of the user's own entity IDs.

CREATE POLICY "Public can view service images"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'service-images');

CREATE POLICY "Owner can upload service images"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'service-images'
    AND (storage.foldername(name))[1] IN (
      SELECT id::text FROM entity WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Owner can update service images"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'service-images'
    AND (storage.foldername(name))[1] IN (
      SELECT id::text FROM entity WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Owner can delete service images"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'service-images'
    AND (storage.foldername(name))[1] IN (
      SELECT id::text FROM entity WHERE user_id = auth.uid()
    )
  );
