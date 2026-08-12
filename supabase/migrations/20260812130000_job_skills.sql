-- Aptitudes partagees entre offres d'emploi et profils candidats (Lot 4,
-- Mission 1 -- schema seul, aucun code applicatif dans cette migration).
--
-- Une aptitude est la MEME notion des deux cotes : une offre en demande
-- ("Demande dans l'offre : Permis B"), un profil en declare ("Machines a
-- bois"). Le referentiel se remplit A L'USAGE (le recruteur ou le candidat
-- saisit librement ; si l'aptitude n'existe pas, elle est creee) -- a la
-- difference de job_sectors (20260804100000_job_sectors.sql), qui est une
-- liste fermee geree uniquement par IBEE via migration. Consequence directe
-- sur les policies : job_sectors n'autorise AUCUNE ecriture cote client ;
-- job_skills autorise l'INSERT a tout utilisateur authentifie, mais jamais
-- l'UPDATE ni le DELETE (voir plus bas -- une aptitude ne se renomme pas,
-- sinon elle change de sens pour tout ce qui la reference deja).
--
-- Nommage : job_skills / entity_job_offer_skills / user_skills (pas
-- user_profile_skills). Le lien profil pointe directement sur auth.users(id),
-- pas sur user_profiles(user_id) -- user_profiles est cree paresseusement
-- (upsertUserProfile, packages/supabase/src/user-profiles.ts) et un candidat
-- doit pouvoir declarer une aptitude en un clic sans jamais avoir rempli son
-- profil au prealable. Meme precedent que favorites.user_id et
-- entity_job_applications.applicant_user_id (tous deux -> auth.users(id)
-- direct, jamais via user_profiles). D'ou le nom user_skills : il reflete ce
-- que la table reference reellement, pas user_profiles.
--
-- PORTEE VOLONTAIREMENT DIFFEREE (signale, pas un oubli) : les policies
-- user_skills sont own-only (voir plus bas), donc un recruteur ne peut pas
-- lire les aptitudes declarees d'un candidat dans cette mission. C'est la
-- moitie "appariement" de la doctrine -- elle demandera une RPC
-- SECURITY DEFINER dediee dans une mission ulterieure, pas ce lot.
--
-- NE PAS TOUCHER entity_job_applications.skills (text[], ajoutee par
-- 20260703160000_entity_job_apps_analytics.sql) : c'est un texte libre par
-- candidature, distinct de ce referentiel normalise. Doublon conceptuel
-- signale, migration de donnees hors perimetre de ce lot.
--
-- FIND-OR-CREATE cote appelant (futur code applicatif, hors cette mission) :
-- INSERT ... ON CONFLICT (normalized_label) DO NOTHING, jamais DO UPDATE --
-- DO UPDATE echouerait sous RLS puisqu'aucune policy UPDATE n'existe sur
-- job_skills (voir plus bas). C'est voulu : une aptitude ne se renomme pas.
-- L'appelant doit RE-SELECTionner par normalized_label apres le INSERT pour
-- recuperer la ligne existante en cas de conflit.

-- =====================================================================
-- 1. Extension pg_trgm (similarite floue -- "Vouliez-vous dire ?" a la
--    saisie, JAMAIS de fusion automatique). Non installee sur le projet au
--    moment d'ecrire cette migration (verifie via l'introspection des
--    extensions) -- meme forme que l'activation d'unaccent
--    (20260413000000_add_publication_slug.sql:7), sans schema explicite.
-- =====================================================================

CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- =====================================================================
-- 2. Fonction de normalisation -- meme algorithme que slugify()
--    (20260413000000_add_publication_slug.sql) : minuscules + accents
--    retires via unaccent() (deja active, schema public). Difference : on
--    reduit les espaces multiples a un seul au lieu de les remplacer par
--    des tirets -- "Permis B", "permis b", "PERMIS  B" doivent toutes
--    produire "permis b", pas un slug.
--    SET search_path ajoute ici (absent de slugify() -- dette existante non
--    reprise) : la fonction alimente une colonne GENERATED + une contrainte
--    UNIQUE, elle doit resoudre unaccent() de la meme facon quel que soit le
--    search_path de l'appelant.
-- =====================================================================
--
-- MIROIR TYPESCRIPT (ajoute Lot 4 Mission 2, feat/job-skills-form) :
-- packages/shared/src/job-skills.ts, fonction normalizeJobSkillLabel().
-- PostgREST ne transforme jamais une valeur envoyee par le client -- toute
-- recherche/creation depuis l'app doit reproduire cet algorithme en TS avant
-- d'interroger normalized_label. VOLONTAIRE : si cette fonction change,
-- normalizeJobSkillLabel() doit suivre a l'identique, sinon la recherche/
-- creation cote app diverge silencieusement de la contrainte UNIQUE
-- reellement appliquee ici.
-- =====================================================================

CREATE OR REPLACE FUNCTION normalize_job_skill_label(input text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path TO 'public'
AS $$
BEGIN
  RETURN btrim(regexp_replace(lower(unaccent(input)), '\s+', ' ', 'g'));
END;
$$;

-- =====================================================================
-- 3. job_skills -- le referentiel partage.
-- =====================================================================

CREATE TABLE job_skills (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  label            text        NOT NULL CHECK (char_length(btrim(label)) BETWEEN 2 AND 60),
  -- Calculee, pas via trigger : contrairement au slug de publications (qui a
  -- besoin d'une boucle anti-collision, generate_unique_publication_slug),
  -- ici on VEUT que deux libelles normalises identiques entrent en
  -- collision -- c'est la contrainte UNIQUE qui fait tout le travail de
  -- dedoublonnage, pas de logique procedurale necessaire.
  normalized_label text        GENERATED ALWAYS AS (normalize_job_skill_label(label)) STORED UNIQUE,
  -- Protection anti-abus (surface d'ecriture ouverte a tout authentifie) :
  -- attribue chaque aptitude a son createur pour permettre un rattachement/
  -- purge en masse le jour ou la moderation (niveau 3, differe explicitement
  -- par la doctrine de ce lot) est construite. Sans UPDATE possible sur
  -- cette table, cette colonne ne peut pas etre falsifiee apres coup.
  -- Nullable + ON DELETE SET NULL (pas NOT NULL + CASCADE) : job_skills est
  -- un referentiel PARTAGE -- la suppression du compte d'un contributeur ne
  -- doit pas faire disparaitre en cascade un terme que d'autres entites
  -- utilisent deja sur leurs offres. Meme logique que job_sectors.sector_id
  -- (ON DELETE RESTRICT plutot que SET NULL "silencieux", mais ici la
  -- colonne n'est pas structurante pour l'affichage -- SET NULL suffit).
  created_by       uuid        REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT auth.uid(),
  created_at       timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE job_skills IS 'Referentiel partage des aptitudes (offres ET profils). Rempli a l''usage, jamais par migration. normalized_label degoublonne insensible a la casse/accents/espaces. Aucune UPDATE/DELETE possible via l''API -- une aptitude ne se renomme pas.';

CREATE INDEX idx_job_skills_normalized_label_trgm ON job_skills USING gin (normalized_label gin_trgm_ops);

ALTER TABLE job_skills ENABLE ROW LEVEL SECURITY;

-- Lecture publique : alimente l'autocompletion (recruteur ET candidat) et
-- l'affichage public des tags sur une offre active.
CREATE POLICY "job_skills_public_select" ON job_skills
  FOR SELECT TO anon, authenticated
  USING (true);

-- Remplissage a l'usage : tout utilisateur authentifie peut creer une
-- aptitude, jamais au nom d'un autre (created_by verifie contre auth.uid()
-- -- le DEFAULT auth.uid() la remplit automatiquement si l'appelant ne la
-- fournit pas, la WITH CHECK bloque toute valeur usurpee si il la fournit).
CREATE POLICY "job_skills_authenticated_insert" ON job_skills
  FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());

-- Aucune policy UPDATE/DELETE : par defaut RLS refuse toute ecriture de ce
-- type, y compris pour le createur de la ligne. VOLONTAIRE (voir en-tete) --
-- meme mecanisme que job_sectors (20260804100000), qui n'a elle non plus
-- aucune policy UPDATE/DELETE.

-- =====================================================================
-- 4. entity_job_offer_skills -- lien offre <-> aptitude, ordonne.
--    Meme structure/policies que entity_job_offer_media
--    (20260804090000_job_offer_media.sql) : la visibilite suit celle de
--    l'offre parente, l'ecriture suit entity_user_has_permission(entity_id,
--    'talent') (20260725100000_entity_job_team_permission_policies.sql).
-- =====================================================================

CREATE TABLE entity_job_offer_skills (
  offer_id       uuid        NOT NULL REFERENCES entity_job_offers(id) ON DELETE CASCADE,
  -- RESTRICT, pas CASCADE : une aptitude ne peut de toute facon jamais etre
  -- supprimee via l'API (aucune policy DELETE sur job_skills), mais RESTRICT
  -- bloque aussi un DELETE superuser/migration qui laisserait des liens
  -- orphelins -- meme choix et meme justification que
  -- entity_job_offers.sector_id (20260804100000_job_sectors.sql:88-89).
  skill_id       uuid        NOT NULL REFERENCES job_skills(id) ON DELETE RESTRICT,
  display_order  integer     NOT NULL DEFAULT 0,
  created_at     timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (offer_id, skill_id)
);

COMMENT ON TABLE entity_job_offer_skills IS 'Aptitudes demandees par une offre ("Demande dans l''offre"), avec ordre d''affichage. Visibilite/ecriture calquees sur entity_job_offer_media.';

CREATE INDEX idx_entity_job_offer_skills_offer_id ON entity_job_offer_skills (offer_id, display_order);

ALTER TABLE entity_job_offer_skills ENABLE ROW LEVEL SECURITY;

CREATE POLICY "entity_job_offer_skills_public_select" ON entity_job_offer_skills
  FOR SELECT TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM entity_job_offers o
      WHERE o.id = entity_job_offer_skills.offer_id AND o.status = 'active'
    )
  );

CREATE POLICY "entity_job_offer_skills_team_select" ON entity_job_offer_skills
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM entity_job_offers o
      WHERE o.id = entity_job_offer_skills.offer_id
        AND entity_user_has_permission(o.entity_id, 'talent')
    )
  );

CREATE POLICY "entity_job_offer_skills_team_insert" ON entity_job_offer_skills
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM entity_job_offers o
      WHERE o.id = entity_job_offer_skills.offer_id
        AND entity_user_has_permission(o.entity_id, 'talent')
    )
  );

CREATE POLICY "entity_job_offer_skills_team_update" ON entity_job_offer_skills
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM entity_job_offers o
      WHERE o.id = entity_job_offer_skills.offer_id
        AND entity_user_has_permission(o.entity_id, 'talent')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM entity_job_offers o
      WHERE o.id = entity_job_offer_skills.offer_id
        AND entity_user_has_permission(o.entity_id, 'talent')
    )
  );

CREATE POLICY "entity_job_offer_skills_team_delete" ON entity_job_offer_skills
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM entity_job_offers o
      WHERE o.id = entity_job_offer_skills.offer_id
        AND entity_user_has_permission(o.entity_id, 'talent')
    )
  );

-- =====================================================================
-- 5. user_skills -- lien profil (candidat) <-> aptitude. Pas d'ordre
--    d'affichage demande cote profil (a la difference du lien offre) --
--    seulement INSERT/DELETE, aucun UPDATE (rien de mutable sur une ligne
--    de lien hors ses cles).
-- =====================================================================

CREATE TABLE user_skills (
  user_id     uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  skill_id    uuid        NOT NULL REFERENCES job_skills(id) ON DELETE RESTRICT,
  created_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, skill_id)
);

COMMENT ON TABLE user_skills IS 'Aptitudes qu''un candidat declare sur son profil. Own-only : un recruteur ne peut pas les lire dans ce lot (voir en-tete de fichier) -- l''appariement demandera une RPC dediee plus tard.';

CREATE INDEX idx_user_skills_user_id ON user_skills (user_id);

ALTER TABLE user_skills ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_skills_own_select" ON user_skills
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "user_skills_own_insert" ON user_skills
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_skills_own_delete" ON user_skills
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

NOTIFY pgrst, 'reload schema';
