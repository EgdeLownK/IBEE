-- Secteurs d'activite pour les offres d'emploi (recrutement).
--
-- Table de reference plutot qu'un enum : ajouter/retirer une valeur = une
-- ligne, sans ALTER TYPE ni migration de donnees. Voir le cout reel d'un
-- changement de valeurs d'un enum deja utilise en RLS dans
-- 20260703150000_entity_job_offers_status_apps.sql (6 operations), et le
-- piege ADD VALUE documente dans
-- 20260731120000_job_offers_contract_types_cadre.sql -- aucun des deux ne
-- s'applique ici puisqu'on n'utilise pas d'enum.
--
-- job_sectors est une table GLOBALE (aucune colonne entity_id) --
-- volontairement NON prefixee entity_ : dans ce repo, ce prefixe marque une
-- table scopee par entity_id (entity_team_roles, entity_product_categories),
-- jamais une table de reference partagee par toute la plateforme.
--
-- Liste fermee geree uniquement par IBEE : aucune policy INSERT/UPDATE/DELETE
-- -- seule une migration (superuser, RLS bypassee) peut modifier son contenu
-- (voir .claude/rules/database.md "Seeds initiales dans la migration").
--
-- entity_job_offers.sector_id est NULLABLE : decision explicite de Killian,
-- les offres existantes n'ont pas de secteur et doivent rester valides sans
-- migration de donnees. L'obligation vit dans le formulaire / l'action
-- serveur, pas dans le schema.
--
-- ON DELETE RESTRICT (pas SET NULL comme products.category_id) : la liste
-- des secteurs est fermee et geree par IBEE, une suppression y est un
-- evenement rare et volontaire -- on prefere bloquer et forcer une
-- reaffectation explicite des offres concernees plutot que degrader
-- silencieusement le filtre/SEO comme le fait category_id pour des
-- categories librement gerees par chaque owner.

-- =====================================================================
-- 1. Table job_sectors
-- =====================================================================

CREATE TABLE job_sectors (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  slug           text        NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9-]+$'),
  label          text        NOT NULL,
  display_order  integer     NOT NULL DEFAULT 0,
  created_at     timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE job_sectors IS 'Liste fermee des secteurs d''activite pour les offres d''emploi. Geree uniquement par migration (voir policies RLS) -- "Autre" doit toujours rester en dernier (display_order le plus eleve).';

ALTER TABLE job_sectors ENABLE ROW LEVEL SECURITY;

-- Lecture publique (visiteurs anonymes inclus) : alimente le formulaire et
-- l'affichage public, meme convention que entity_job_offers_public_select.
CREATE POLICY "job_sectors_public_select" ON job_sectors
  FOR SELECT TO anon, authenticated
  USING (true);

-- Aucune policy INSERT/UPDATE/DELETE definie : par defaut RLS refuse toute
-- ecriture, y compris pour authenticated. Seule une migration peut modifier
-- cette table (bypass RLS via le role postgres/superuser du CLI).

-- =====================================================================
-- 2. Valeurs initiales -- "autre" toujours en dernier (display_order max)
-- =====================================================================

INSERT INTO job_sectors (slug, label, display_order) VALUES
  ('restauration-hotellerie', 'Restauration & Hôtellerie', 10),
  ('commerce-vente', 'Commerce & Vente', 20),
  ('btp-construction', 'BTP & Construction', 30),
  ('transport-logistique', 'Transport & Logistique', 40),
  ('informatique-numerique', 'Informatique & Numérique', 50),
  ('sante-social', 'Santé & Social', 60),
  ('education-formation', 'Éducation & Formation', 70),
  ('industrie-production', 'Industrie & Production', 80),
  ('artisanat', 'Artisanat', 90),
  ('banque-assurance-finance', 'Banque, Assurance & Finance', 100),
  ('juridique', 'Juridique', 110),
  ('marketing-communication-design', 'Marketing, Communication & Design', 120),
  ('ressources-humaines', 'Ressources humaines', 130),
  ('administration-secretariat', 'Administration & Secrétariat', 140),
  ('agriculture-environnement', 'Agriculture & Environnement', 150),
  ('beaute-bien-etre', 'Beauté & Bien-être', 160),
  ('securite', 'Sécurité', 170),
  ('culture-sport-loisirs', 'Culture, Sport & Loisirs', 180),
  ('immobilier', 'Immobilier', 190),
  ('autre', 'Autre', 200);

-- =====================================================================
-- 3. Reference sur entity_job_offers
-- =====================================================================

ALTER TABLE entity_job_offers
  ADD COLUMN sector_id uuid REFERENCES job_sectors(id) ON DELETE RESTRICT;

-- Partiel sur les offres actives : c'est ce sous-ensemble que la similarite
-- et les filtres publics parcourent, meme pattern que idx_products_category
-- (20260604150000_products_v2_form.sql) sur products.category_id.
CREATE INDEX idx_entity_job_offers_sector_id ON entity_job_offers (sector_id) WHERE status = 'active';

NOTIFY pgrst, 'reload schema';
