-- Types de widgets Accueil alignés sur les contenus IBEE (shop, service, event…)
ALTER TYPE home_widget_type ADD VALUE IF NOT EXISTS 'widget_shop';
ALTER TYPE home_widget_type ADD VALUE IF NOT EXISTS 'widget_service';
ALTER TYPE home_widget_type ADD VALUE IF NOT EXISTS 'widget_event';
ALTER TYPE home_widget_type ADD VALUE IF NOT EXISTS 'widget_news';
ALTER TYPE home_widget_type ADD VALUE IF NOT EXISTS 'widget_history';
ALTER TYPE home_widget_type ADD VALUE IF NOT EXISTS 'widget_announcement';
