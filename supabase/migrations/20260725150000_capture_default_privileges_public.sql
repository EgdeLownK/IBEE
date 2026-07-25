-- Derive prod jamais migree : ALTER DEFAULT PRIVILEGES sur le schema public
-- pour le role postgres, accordant automatiquement tous les privileges sur
-- toute nouvelle table/fonction/sequence a anon/authenticated/service_role.
-- Explique pourquoi le GRANT est uniformement present sur toutes les tables
-- (voir aussi 20260724110000/20260725090000/20260725120000, qui restent
-- necessaires pour les objets crees AVANT ce reglage).
--
-- Un meme reglage existe en prod pour le role supabase_admin, mais il est
-- hors de portee d'une migration : ALTER DEFAULT PRIVILEGES FOR ROLE X
-- exige d'etre ce role (ou superuser dans ce role). Le role "postgres" du
-- CLI (celui qui execute les migrations, en local comme en prod) n'est ni
-- superuser ni membre de supabase_admin -- verifie en local (permission
-- denied to change default privileges). supabase_admin est reserve aux
-- operations internes Supabase (dashboard, plateforme) : cette moitie reste
-- un plancher plateforme non capturable, pas une omission.

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT ALL ON TABLES TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT ALL ON FUNCTIONS TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT ALL ON SEQUENCES TO postgres, anon, authenticated, service_role;
