-- Corrige la policy "favorites: own read" (migration 20260722170000) : elle vérifiait
-- seulement `anonymous_id is not null`, jamais que l'anonymous_id correspond à
-- l'appelant. Résultat : n'importe quel visiteur anonyme pouvait lire les favoris
-- anonymes de tout le monde via le client Supabase (anon key). Voir _BRAIN-DEV.md
-- §Patterns sécurité et _BRAIN-STATE.md §Dette.
--
-- Postgres n'a aucune notion native d'« appelant anonyme » : `auth.uid()` est null
-- pour tout visiteur non connecté, donc rien ne distingue un anonyme d'un autre côté
-- SQL. Le fix retenu : restreindre les policies à `auth.uid() = user_id` uniquement.
-- La lecture/écriture anonyme (via anonymous_id) se fera plus tard par une route
-- serveur (service role) qui certifie l'identifiant via un cookie signé — jamais en
-- lecture/écriture directe côté client RLS. Décision A vs B (route serveur + cookie
-- signé vs auth anonyme Supabase) reportée à la spec de la feature "favoris anonymes" ;
-- préférence actuelle : route serveur (portable vers Better Auth, ne couple pas
-- davantage à Supabase Auth qu'on prévoit de quitter).
--
-- Le même défaut existait côté insert : `with check (auth.uid() = user_id or user_id
-- is null)` permettait d'insérer une ligne anonyme avec n'importe quel anonymous_id.
-- Corrigé pour la même raison.
--
-- Aucune policy update n'existe sur favorites (ni avant, ni après cette migration) :
-- les updates sont refusées par défaut par RLS. Les helpers (`packages/supabase/src/
-- favorites.ts`) ne font qu'insert/delete — ne pas ajouter de policy update pour
-- "couvrir" ce cas, ça élargirait l'accès sans besoin fonctionnel.
--
-- La colonne `anonymous_id` et la contrainte `favorites_has_owner` sont conservées :
-- aucun code applicatif ne les utilise aujourd'hui (seuls les helpers user_id du MVP
-- recrutement existent), elles restent réservées pour la feature "favoris anonymes"
-- à venir.

alter policy "favorites: own read" on public.favorites
  using (auth.uid() = user_id);

alter policy "favorites: own insert" on public.favorites
  with check (auth.uid() = user_id);

comment on column public.favorites.anonymous_id is
  'Réservé pour la feature "favoris anonymes" (non implémentée). Ne jamais l''exposer en lecture/écriture directe côté client RLS — lier à l''appelant via un mécanisme serveur (cookie signé) avant toute policy qui s''appuie dessus. Voir migration 20260724100000.';
