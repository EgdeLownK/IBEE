import tseslint from 'typescript-eslint'

// Garde-fou anti-régression : `eslint-suppressions.json` (généré par
// `pnpm exec eslint . --suppress-all`) gèle les violations préexistantes au
// moment de sa création — elles ne bloquent pas `pnpm lint`/la CI, mais toute
// violation NOUVELLE (même règle, même fichier) fait échouer la commande.
// Après un lot de correction, élaguer les entrées devenues inutiles :
//   pnpm exec eslint . --prune-suppressions
// Ne pas régénérer avec `--suppress-all` sauf pour geler volontairement un
// nouvel état — ce n'est pas un outil de correction.
export default tseslint.config(...tseslint.configs.recommended, {
  ignores: ['dist/**'],
})
