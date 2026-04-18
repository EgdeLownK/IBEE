-- =============================================================================
-- Migration : Profil Agora système + garde slug "__"
-- =============================================================================

-- 1. Mettre à jour generate_unique_slug_from_email
--    Garde : les slugs commençant par "_" sont préfixés par "u"
--    pour réserver le préfixe "__" aux entities système.
CREATE OR REPLACE FUNCTION generate_unique_slug_from_email(email_input text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  base_slug text;
  final_slug text;
  counter integer := 0;
BEGIN
  -- Base slug depuis la partie avant @
  base_slug := lower(split_part(email_input, '@', 1));
  -- Nettoyer les caractères non alphanumériques
  base_slug := regexp_replace(base_slug, '[^a-z0-9]', '', 'g');
  -- Garde : si le slug commence par "_", le préfixer avec "u"
  IF base_slug ~ '^_' THEN
    base_slug := 'u' || base_slug;
  END IF;
  -- Si vide, fallback
  IF base_slug = '' THEN
    base_slug := 'user';
  END IF;
  final_slug := base_slug;
  WHILE EXISTS (SELECT 1 FROM public.entity WHERE slug = final_slug) LOOP
    counter := counter + 1;
    final_slug := base_slug || counter::text;
  END LOOP;
  RETURN final_slug;
END;
$$;

-- 2. Insérer le profil Agora système (user_id NULL = entity orpheline)
INSERT INTO public.entity (
  slug,
  display_name,
  bio,
  role,
  location,
  avatar_url,
  user_id
) VALUES (
  '__agora__',
  'Agora',
  'Agora est une plateforme française qui transforme chaque solopreneur en un site web personnel professionnel en 8 minutes. Être trouvé, compris, contacté, payé, mesuré — tout au même endroit. Conçue pour être nativement lue par Google, ChatGPT, Claude et Perplexity.',
  'La plateforme des solopreneurs',
  'France',
  NULL,
  NULL
);
