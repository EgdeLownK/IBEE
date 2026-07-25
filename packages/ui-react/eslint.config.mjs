import tseslint from 'typescript-eslint'

// Garde-fou anti-régression lint, en deux parties qui doivent rester synchronisées :
// - `eslint-suppressions.json` (ce dossier) gèle les erreurs déjà présentes au
//   moment de sa création — ici un fichier vide (`{}`), ce package n'avait aucune
//   erreur au moment de la mise en place. `pnpm lint` échoue dès qu'une violation
//   apparaît, puisqu'il n'y a rien à geler.
// - `--max-warnings 0` dans le script "lint" de `package.json` (ce dossier) : ce
//   package n'a aucun warning préexistant non plus, donc le moindre nouveau
//   warning échoue.
//
// Procédure après un lot de correction touchant ce package (ou dès qu'une
// violation y apparaît puis est corrigée) :
// 1. `pnpm exec eslint . --prune-suppressions` — étape OBLIGATOIRE, pas optionnelle :
//    une entrée de suppression devenue inutile (violation corrigée mais toujours
//    listée dans le JSON) fait échouer `pnpm lint` avec le message "There are
//    suppressions left that do not occur anymore", même sans aucune violation
//    nouvelle par ailleurs. (Le flag `--pass-on-unpruned-suppressions` existe pour
//    ignorer cette alerte et repasser en exit 0 malgré des suppressions périmées —
//    VOLONTAIRE : il n'est utilisé nulle part ici, car il désactiverait le seul
//    signal qui rappelle de faire cette étape.)
// 2. Committer le `eslint-suppressions.json` mis à jour par l'étape 1.
//
// VOLONTAIRE : ne jamais relancer `--suppress-all` après la mise en place initiale.
// Cette commande regénère le fichier à partir de TOUT ce qui existe au moment où
// elle tourne — toute violation apparue entre-temps serait gelée avec les
// anciennes, et le garde-fou ne la détecterait plus jamais. Seul
// `--prune-suppressions` doit faire évoluer ce fichier après la création initiale.
export default tseslint.config(...tseslint.configs.recommended, {
  ignores: ['dist/**'],
})
