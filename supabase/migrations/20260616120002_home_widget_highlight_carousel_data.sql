-- Étape 2/2 : migration des widgets shop/service/event/news → highlight/carousel
-- Exécuter après commit de 20260616120000_home_widget_highlight_carousel_enum.sql

-- Shop : produit → mise en avant
UPDATE entity_home_widgets
SET
  type = 'widget_highlight',
  config = jsonb_build_object(
    'mode', 'single',
    'item', jsonb_build_object('kind', 'product', 'id', config ->> 'product_id')
  )
WHERE type = 'widget_shop'
  AND config ->> 'mode' = 'product'
  AND nullif(config ->> 'product_id', '') IS NOT NULL;

-- Shop : catégorie → carrousel
UPDATE entity_home_widgets
SET
  type = 'widget_carousel',
  config = jsonb_build_object(
    'mode', 'collection',
    'source_kind', 'shop_category',
    'category_id', config ->> 'category_id',
    'limit', COALESCE(NULLIF(config ->> 'limit', '')::int, 6)
  )
WHERE type = 'widget_shop'
  AND config ->> 'mode' = 'collection'
  AND nullif(config ->> 'category_id', '') IS NOT NULL;

-- Service : un service → mise en avant
UPDATE entity_home_widgets
SET
  type = 'widget_highlight',
  config = jsonb_build_object(
    'mode', 'single',
    'item', jsonb_build_object('kind', 'service', 'id', config ->> 'appointment_type_id')
  )
WHERE type = 'widget_service'
  AND config ->> 'mode' IN ('service', 'featured')
  AND nullif(config ->> 'appointment_type_id', '') IS NOT NULL;

-- Service : collection → carrousel services
UPDATE entity_home_widgets
SET
  type = 'widget_carousel',
  config = jsonb_build_object(
    'mode', 'collection',
    'source_kind', 'services',
    'limit', COALESCE(NULLIF(config ->> 'limit', '')::int, 6)
  )
WHERE type = 'widget_service'
  AND config ->> 'mode' IN ('collection', 'list');

-- Event : un event → mise en avant
UPDATE entity_home_widgets
SET
  type = 'widget_highlight',
  config = jsonb_build_object(
    'mode', 'single',
    'item', jsonb_build_object('kind', 'event', 'id', config ->> 'event_id')
  )
WHERE type = 'widget_event'
  AND config ->> 'mode' = 'featured'
  AND nullif(config ->> 'event_id', '') IS NOT NULL;

-- Event : liste → carrousel events
UPDATE entity_home_widgets
SET
  type = 'widget_carousel',
  config = jsonb_build_object(
    'mode', 'collection',
    'source_kind', 'events',
    'limit', COALESCE(NULLIF(config ->> 'limit', '')::int, 6)
  )
WHERE type = 'widget_event'
  AND config ->> 'mode' = 'list';

-- News → carrousel news
UPDATE entity_home_widgets
SET
  type = 'widget_carousel',
  config = jsonb_build_object(
    'mode', 'collection',
    'source_kind', 'news',
    'limit', COALESCE(NULLIF(config ->> 'limit', '')::int, 3)
  )
WHERE type = 'widget_news';
