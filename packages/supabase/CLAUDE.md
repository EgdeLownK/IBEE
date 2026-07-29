# packages/supabase — Client & helpers BDD

Package partagé utilisé par `apps/platform`. Types auto-générés, helpers typés.

## Frontière

Un helper a sa place ici s'il exécute une requête Supabase (lecture ou
écriture) sur une table/vue/RPC du projet. Le reste va ailleurs :
- Validation/calcul indépendant de la BDD (wizards, formats, transforms) →
  `packages/shared`, pas ici — ce package ne contient aucune logique métier
  qui ne touche pas Supabase.
- Rendu, composants, hooks → jamais ici. Aucune dépendance React/Next dans
  ce package (confirmé : aucun import `react`/`next` dans `src/`, y compris
  `auth/server.ts` qui reçoit les cookies via un adaptateur générique plutôt
  que d'importer `next/headers` — le package reste agnostique du framework
  appelant).
- Code spécifique Next.js (Server Actions, Route Handlers, revalidation) →
  `apps/platform`.

## Convention

- Un fichier par domaine (`bookings.ts`, `events.ts`, `event-tickets.ts`,
  …) — créer un nouveau fichier pour un nouveau domaine plutôt que
  d'étendre un fichier existant qui ne le concerne pas. Fonctions nommées
  par verbe (`get`/`list`/`create`/`update`/`delete` + Domaine).
- Tout export public passe par `src/index.ts` (barrel) : un helper non
  réexporté là n'est pas utilisable depuis `apps/platform`. Exception :
  les helpers `auth/*`, exposés via sous-chemins dédiés déclarés dans
  `package.json` (`@ibee/supabase/auth/server`, `/auth/browser`,
  `/auth/middleware`), pas via le barrel principal.
- `src/types.ts` est généré — ne jamais l'éditer manuellement (voir
  §Régénérer les types).

## Tables
Liste exacte et à jour dans `src/types.ts` (`Database['public']['Tables']`) — ne pas recopier de compte ici, il dérive à chaque migration.

## Régénérer les types
```bash
pnpm gen-types
```
