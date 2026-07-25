import tseslint from 'typescript-eslint'

// `eslint-suppressions.json` (ce dossier) gèle les erreurs de lint déjà
// présentes au moment de sa création ; `--max-warnings 0` du script "lint"
// dans `package.json` reflète l'absence de warning préexistant ici.
// Procédure de maintenance, interdictions et diagnostic CI rouge :
// voir `.claude/rules/lint.md`, seule source de vérité sur ce mécanisme.
export default tseslint.config(...tseslint.configs.recommended, {
  ignores: ['dist/**'],
})
