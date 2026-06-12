-- Histoire : blocs texte + image réordonnables (JSONB)
ALTER TABLE entity_history
  ADD COLUMN IF NOT EXISTS blocks jsonb NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN entity_history.blocks IS
  'Blocs de contenu ordonnés : [{ type: "text", content }, { type: "image", url, alt? }]';

-- Migration du texte legacy vers un premier bloc texte
UPDATE entity_history
SET blocks = jsonb_build_array(jsonb_build_object('type', 'text', 'content', content))
WHERE (blocks IS NULL OR blocks = '[]'::jsonb)
  AND content IS NOT NULL
  AND btrim(content) <> '';
