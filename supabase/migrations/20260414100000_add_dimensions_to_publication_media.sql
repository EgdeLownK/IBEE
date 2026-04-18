-- Add width and height columns to publication_media for intelligent crop
-- Both nullable to preserve backward compatibility with existing rows
-- Existing rows will have NULL and use a CSS fallback (aspect-ratio: 3/2, object-fit: cover)

ALTER TABLE publication_media
  ADD COLUMN width integer,
  ADD COLUMN height integer;

ALTER TABLE publication_media
  ADD CONSTRAINT publication_media_width_positive CHECK (width IS NULL OR width > 0),
  ADD CONSTRAINT publication_media_height_positive CHECK (height IS NULL OR height > 0);

COMMENT ON COLUMN publication_media.width IS 'Width in pixels of the source image after WebP conversion';
COMMENT ON COLUMN publication_media.height IS 'Height in pixels of the source image after WebP conversion';
