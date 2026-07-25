import { defineConfig, globalIgnores } from 'eslint/config'
import nextVitals from 'eslint-config-next/core-web-vitals'
import nextTs from 'eslint-config-next/typescript'

// Garde-fou anti-régression : `eslint-suppressions.json` (généré par
// `pnpm exec eslint . --suppress-all`) gèle les violations préexistantes au
// moment de sa création — elles ne bloquent pas `pnpm lint`/la CI, mais toute
// violation NOUVELLE (même règle, même fichier) fait échouer la commande.
// Après un lot de correction, élaguer les entrées devenues inutiles :
//   pnpm exec eslint . --prune-suppressions
// Ne pas régénérer avec `--suppress-all` sauf pour geler volontairement un
// nouvel état — ce n'est pas un outil de correction.

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
