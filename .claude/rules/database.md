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
