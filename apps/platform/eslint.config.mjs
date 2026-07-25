import { defineConfig, globalIgnores } from 'eslint/config'
import nextVitals from 'eslint-config-next/core-web-vitals'
import nextTs from 'eslint-config-next/typescript'

// `eslint-suppressions.json` (ce dossier) gèle les erreurs de lint déjà
// présentes au moment de sa création ; `--max-warnings 119` du script "lint"
// dans `package.json` plafonne les warnings au nombre déjà présent ici.
// Procédure de maintenance, interdictions et diagnostic CI rouge :
// voir `.claude/rules/lint.md`, seule source de vérité sur ce mécanisme.

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
