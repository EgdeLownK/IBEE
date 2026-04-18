-- =============================================================================
-- Enums
-- =============================================================================

CREATE TYPE menu_section_type AS ENUM (
  'home', 'news', 'events', 'videos', 'shop', 'links'
);

CREATE TYPE home_widget_type AS ENUM (
  'widget_news_feed', 'widget_upcoming_events', 'widget_featured_videos',
  'widget_featured_products', 'widget_links_grid', 'widget_testimonials'
);

CREATE TYPE global_feature_type AS ENUM ('faq');

-- =============================================================================
-- Tables
-- =============================================================================

-- Menu sections (onglets du profil)
CREATE TABLE entity_menu_sections (
  id            uuid            PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id     uuid            NOT NULL REFERENCES entity(id) ON DELETE CASCADE,
  type          menu_section_type NOT NULL,
  is_active     boolean         NOT NULL DEFAULT false,
  is_configured boolean         NOT NULL DEFAULT false,
  position      integer         NOT NULL DEFAULT 0,
  created_at    timestamptz     NOT NULL DEFAULT now(),
  updated_at    timestamptz     NOT NULL DEFAULT now(),
  UNIQUE (entity_id, type)
);

CREATE INDEX idx_entity_menu_sections_entity_id ON entity_menu_sections(entity_id);

-- Home widgets
CREATE TABLE entity_home_widgets (
  id            uuid            PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id     uuid            NOT NULL REFERENCES entity(id) ON DELETE CASCADE,
  type          home_widget_type NOT NULL,
  is_active     boolean         NOT NULL DEFAULT false,
  position      integer         NOT NULL DEFAULT 0,
  config        jsonb           NOT NULL DEFAULT '{}'::jsonb,
  created_at    timestamptz     NOT NULL DEFAULT now(),
  updated_at    timestamptz     NOT NULL DEFAULT now()
);

CREATE INDEX idx_entity_home_widgets_entity_id ON entity_home_widgets(entity_id);

-- Global features (FAQ, etc.)
CREATE TABLE entity_global_features (
  id            uuid            PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id     uuid            NOT NULL REFERENCES entity(id) ON DELETE CASCADE,
  type          global_feature_type NOT NULL,
  is_active     boolean         NOT NULL DEFAULT false,
  is_configured boolean         NOT NULL DEFAULT false,
  created_at    timestamptz     NOT NULL DEFAULT now(),
  updated_at    timestamptz     NOT NULL DEFAULT now(),
  UNIQUE (entity_id, type)
);

CREATE INDEX idx_entity_global_features_entity_id ON entity_global_features(entity_id);

-- FAQ items
CREATE TABLE entity_faq_items (
  id            uuid            PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id     uuid            NOT NULL REFERENCES entity(id) ON DELETE CASCADE,
  question      text            NOT NULL,
  answer        text            NOT NULL,
  position      integer         NOT NULL DEFAULT 0,
  created_at    timestamptz     NOT NULL DEFAULT now(),
  updated_at    timestamptz     NOT NULL DEFAULT now()
);

CREATE INDEX idx_entity_faq_items_entity_id ON entity_faq_items(entity_id);

-- =============================================================================
-- RLS
-- =============================================================================

ALTER TABLE entity_menu_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE entity_home_widgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE entity_global_features ENABLE ROW LEVEL SECURITY;
ALTER TABLE entity_faq_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "entity_menu_sections_select_active"
  ON entity_menu_sections FOR SELECT
  USING (is_active = true);

CREATE POLICY "entity_home_widgets_select_active"
  ON entity_home_widgets FOR SELECT
  USING (is_active = true);

CREATE POLICY "entity_global_features_select_active"
  ON entity_global_features FOR SELECT
  USING (is_active = true);

CREATE POLICY "entity_faq_items_select_public"
  ON entity_faq_items FOR SELECT
  USING (true);

-- =============================================================================
-- Triggers (réutilise set_updated_at() existante)
-- =============================================================================

CREATE TRIGGER trg_entity_menu_sections_updated_at
  BEFORE UPDATE ON entity_menu_sections
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_entity_home_widgets_updated_at
  BEFORE UPDATE ON entity_home_widgets
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_entity_global_features_updated_at
  BEFORE UPDATE ON entity_global_features
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_entity_faq_items_updated_at
  BEFORE UPDATE ON entity_faq_items
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
