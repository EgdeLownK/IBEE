-- Nettoyage de 3 fonctions mortes trouvees en prod lors du diff de schema
-- complet, sans trace en migration et sans appelant dans le code applicatif
-- (verifie par grep sur apps/platform et packages/) :
--
-- - get_user_entity_ids() : referencait entity_members, table qui n'existe
--   plus (renommee entity_team_members lors d'une refonte).
-- - insert_slug_history(uuid, text) : referencait slug_history, table qui
--   n'existe plus (product_slug_history est un objet different).
-- - init_entity_sections() : trigger function referencant entity_sections
--   et d'anciens types de sections (accueil/histoire/portfolio...) remplaces
--   par entity_menu_sections/menu_section_type. N'est attachee a aucun
--   trigger actuellement (verifie via information_schema.triggers).
--
-- Les trois sont cassees si jamais appelees (referencent des tables
-- inexistantes) -- du code mort en base est un piege pour la prochaine
-- session qui tomberait dessus. Recreables depuis l'historique git si
-- besoin un jour.

DROP FUNCTION IF EXISTS public.get_user_entity_ids();
DROP FUNCTION IF EXISTS public.insert_slug_history(uuid, text);
DROP FUNCTION IF EXISTS public.init_entity_sections();
