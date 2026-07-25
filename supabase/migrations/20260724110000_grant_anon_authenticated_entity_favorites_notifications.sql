-- Découvert le 24/07 en rejouant les migrations depuis zéro pour la première
-- fois (CI pgTAP) : `anon`/`authenticated` n'ont aucun GRANT SQL explicite sur
-- entity/favorites/notifications dans une base rejouée depuis les fichiers de
-- migration seuls — alors qu'en prod ces privilèges existent (probablement
-- posés manuellement au bootstrap initial du projet, jamais capturés en
-- migration). RLS ne remplace pas les GRANT : sans privilège table, la requête
-- échoue avant même que la policy soit évaluée ("permission denied").
-- Reproduit ici l'état réel de la prod (vérifié via information_schema.role_table_grants).
grant select, insert, update, delete on table public.entity, public.favorites, public.notifications
  to anon, authenticated;
