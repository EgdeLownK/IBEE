-- Étape 1/2 : nouvelles valeurs enum (doit être commité avant les UPDATE)
-- PostgreSQL interdit d'utiliser une valeur enum ajoutée dans la même transaction.

ALTER TYPE home_widget_type ADD VALUE IF NOT EXISTS 'widget_highlight';
ALTER TYPE home_widget_type ADD VALUE IF NOT EXISTS 'widget_carousel';
