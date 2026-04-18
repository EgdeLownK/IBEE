---
paths:
  - "packages/supabase/**"
  - "supabase/migrations/**"
---
# Règles Supabase & base de données

- RLS activé sur toutes les tables sans exception — écrire la policy dans la même migration
- Jamais de clé `service_role` côté client, uniquement `anon` key dans le navigateur
- Jamais de `service_role` dans `apps/web` — uniquement dans `apps/dashboard` côté serveur
- Migrations dans `supabase/migrations/` — jamais de modification directe en production
- Mode CLI linked remote-only : on travaille contre la prod, pas de Docker local
- Workflow après migration : Killian fait `db push` → vérifier schéma → `gen types` :
  ```bash
  pnpm supabase gen types typescript --project-id ztblirxxptdwqobmervk > packages/supabase/src/types.ts
  ```
- Helpers typés dans `packages/supabase/src/` — vérifier qu'un helper existe avant d'en créer un nouveau
- Client authentifié obligatoire pour tables avec RLS dépendant de `auth.uid()` (pattern `createAuthClient`)
- Seeds initiales dans la migration, updates de seed dans `supabase/seeds/*.sql` via SQL Editor
