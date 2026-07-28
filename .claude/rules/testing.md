---
paths:
  - "**/*.test.ts"
  - "**/*.spec.ts"
  - "**/vitest.config.*"
---
# Règles testing

## Framework
- **Vitest** exclusivement. Pas de Jest, pas de Mocha.
- Config dans chaque package qui a des tests (`vitest.config.ts`)
- Pipeline Turbo : `pnpm test` exécute tous les tests via Turbo

## Quand écrire des tests
- Chaque helper dans `packages/supabase/src/` doit avoir un test
- Chaque utilitaire partagé doit avoir un test
- Les composants UI ne sont PAS testés unitairement (validation visuelle navigateur)

## Patterns
- Mock du client Supabase via factory function `createMockClient()`
- Pas de tests d'intégration contre la vraie BDD (linked remote = prod)
- Nommage : `[module].test.ts` à côté du fichier source ou dans `__tests__/`

## Chaîne de vérification
Après chaque tâche d'implémentation :
1. `pnpm type-check`
2. `pnpm test`
3. `pnpm build`
