-- Ajoute les types `history` et `faq` à l'ENUM menu_section_type
-- pour permettre l'activation de ces sections dans MenuTabs.

ALTER TYPE public.menu_section_type ADD VALUE IF NOT EXISTS 'history';
ALTER TYPE public.menu_section_type ADD VALUE IF NOT EXISTS 'faq';
