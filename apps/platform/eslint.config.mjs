import { defineConfig, globalIgnores } from 'eslint/config'
import nextVitals from 'eslint-config-next/core-web-vitals'
import nextTs from 'eslint-config-next/typescript'

// Garde-fou anti-régression lint, en deux parties qui doivent rester synchronisées :
// - `eslint-suppressions.json` (ce dossier) gèle les erreurs déjà présentes au
//   moment de sa création. `pnpm lint` reste vert tant qu'aucune violation NOUVELLE
//   n'apparaît sur une règle donnée ; au-delà du nombre gelé, la commande échoue.
// - `--max-warnings 119` dans le script "lint" de `package.json` (ce dossier)
//   plafonne les warnings au nombre exact déjà présent ici : ce package est le seul
//   à en avoir (no-unused-vars, no-img-element, exhaustive-deps) ; les 3 autres
//   packages du monorepo sont à `--max-warnings 0`.
//
// Procédure après un lot de correction touchant ce package :
// 1. `pnpm exec eslint . --prune-suppressions` — étape OBLIGATOIRE, pas optionnelle :
//    une entrée de suppression devenue inutile (violation corrigée mais toujours
//    listée dans le JSON) fait échouer `pnpm lint` avec le message "There are
//    suppressions left that do not occur anymore", même sans aucune violation
//    nouvelle par ailleurs. (Le flag `--pass-on-unpruned-suppressions` existe pour
//    ignorer cette alerte et repasser en exit 0 malgré des suppressions périmées —
//    VOLONTAIRE : il n'est utilisé nulle part ici, car il désactiverait le seul
//    signal qui rappelle de faire cette étape.)
// 2. Recompter les warnings réels (`pnpm exec eslint .` sans `--max-warnings`) et
//    baisser `--max-warnings` dans `package.json` si des warnings ont disparu.
// 3. Committer le `eslint-suppressions.json` mis à jour par l'étape 1.
//
// VOLONTAIRE : ne jamais relancer `--suppress-all` après la mise en place initiale.
// Cette commande regénère le fichier à partir de TOUT ce qui existe au moment où
// elle tourne — toute violation apparue entre-temps serait gelée avec les
// anciennes, et le garde-fou ne la détecterait plus jamais. Seul
// `--prune-suppressions` doit faire évoluer ce fichier après la création initiale.

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          destructuredArrayIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
  ]),
])

export default eslintConfig
