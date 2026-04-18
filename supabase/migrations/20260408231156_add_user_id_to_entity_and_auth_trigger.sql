-- Ajouter user_id à entity (nullable pour ne pas casser la seed killian)
ALTER TABLE entity ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
CREATE INDEX idx_entity_user_id ON entity(user_id);

-- Policy RLS : un utilisateur peut UPDATE uniquement sa propre entity
CREATE POLICY "entity_owner_update" ON entity
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Fonction pour générer un slug unique depuis un email
CREATE OR REPLACE FUNCTION generate_unique_slug_from_email(email_input text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  base_slug text;
  candidate_slug text;
  suffix text;
  collision_count int;
BEGIN
  base_slug := lower(regexp_replace(split_part(email_input, '@', 1), '[^a-z0-9]+', '-', 'g'));
  base_slug := trim(both '-' from base_slug);
  IF base_slug = '' THEN
    base_slug := 'user';
  END IF;

  candidate_slug := base_slug;

  SELECT COUNT(*) INTO collision_count FROM public.entity WHERE slug = candidate_slug;

  WHILE collision_count > 0 LOOP
    suffix := substr(md5(random()::text), 1, 4);
    candidate_slug := base_slug || '-' || suffix;
    SELECT COUNT(*) INTO collision_count FROM public.entity WHERE slug = candidate_slug;
  END LOOP;

  RETURN candidate_slug;
END;
$$;

-- Fonction trigger : crée une entity automatiquement pour chaque nouvel utilisateur
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_slug text;
  display_name_value text;
BEGIN
  new_slug := public.generate_unique_slug_from_email(NEW.email::text);
  display_name_value := split_part(NEW.email::text, '@', 1);

  INSERT INTO public.entity (user_id, slug, display_name)
  VALUES (NEW.id, new_slug, display_name_value);

  RETURN NEW;
END;
$$;

-- Créer le trigger sur auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
