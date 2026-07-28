---
paths:
  - "packages/supabase/**"
  - "supabase/migrations/**"
---
# Règles Supabase & base de données

- RLS activé sur toutes les tables sans exception — écrire la policy dans la même migration
- Jamais de clé `service_role` côté client, uniquement `anon` key dans le navigateur
- Jamais de `service_role` côté client — uniquement dans `apps/platform` côté serveur
- Migrations dans `supabase/migrations/` — **toute migration passe par le CLI (`pnpm supabase db push`), jamais d'application manuelle en SQL Editor ou via un outil MCP hors fichier tracké.** C'est l'application manuelle répétée qui a désynchronisé `schema_migrations` des fichiers réels (dette découverte 2026-07-24, voir `_BRAIN-STATE.md` §Dette). Exception documentée : hotfix RLS du 24/07 (`20260724100000_favorites_rls_restrict_owner.sql`), appliqué directement en ciblé vu l'état déjà cassé du suivi — choix délibéré, pas la norme.
- Docker local sert aux tests pgTAP (`supabase start` + `supabase test db`, même mécanisme qu'en CI job `db-tests` de `ci.yml`) — les migrations, elles, passent par `pnpm supabase db push` contre le projet distant (linked), jamais par le dashboard Supabase
- Workflow après migration : `pnpm supabase db push` → vérifier schéma → `pnpm gen-types`
- Helpers typés dans `packages/supabase/src/` — vérifier qu'un helper existe avant d'en créer un nouveau
- Client authentifié obligatoire pour tables avec RLS dépendant de `auth.uid()` (pattern `createAuthClient`)
- Seeds initiales dans la migration, updates de seed dans `supabase/seeds/*.sql` via SQL Editor
- **Une policy RLS doit vérifier l'identité de l'appelant, jamais la simple existence d'un champ.** `auth.uid()` est `null` pour tout visiteur non connecté — une condition du type `colonne is not null` ne distingue rien côté SQL et peut exposer les lignes de tout le monde à tout le monde. Tout scoping par identifiant client (cookie, anonymous_id) doit passer par un mécanisme serveur qui certifie l'identifiant, jamais par une condition d'existence en lecture/écriture directe côté client.
- **Identité côté serveur uniquement** : `auth.getUser()` server-side (pattern déjà utilisé dans la codebase — `apps/platform/src/lib/supabase/middleware.ts` et la majorité des Server Actions/Route Handlers), jamais `user_id` transmis par le client comme source de vérité.
- **Fonctions RPC `SECURITY DEFINER`** pour les écritures dans les tables protégées (pattern déjà utilisé, plusieurs dizaines de fonctions dans `supabase/migrations/` — vérifier l'existant avant d'en écrire une nouvelle). Pas d'INSERT/UPDATE direct côté client sur ces tables.
