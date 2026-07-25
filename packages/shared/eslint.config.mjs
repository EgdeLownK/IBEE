import tseslint from 'typescript-eslint'

// Garde-fou anti-régression lint, en deux parties qui doivent rester synchronisées :
// - `eslint-suppressions.json` (ce dossier) gèle les erreurs déjà présentes au
//   moment de sa création. `pnpm lint` reste vert tant qu'aucune violation NOUVELLE
//   n'apparaît sur une règle donnée ; au-delà du nombre gelé, la commande échoue.
// - `--max-warnings 0` dans le script "lint" de `package.json` (ce dossier) : ce
//   package n'a aucun warning préexistant, donc le moindre nouveau warning échoue.
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
