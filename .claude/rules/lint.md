---
paths:
  - "**/eslint.config.mjs"
  - "**/eslint-suppressions.json"
  - ".github/workflows/ci.yml"
---
# Règles lint (eslint-suppressions.json)

## Ce que c'est et pourquoi

Le monorepo a 4 packages lintés séparément : `apps/platform`, `packages/shared`,
`packages/supabase`, `packages/ui-react`. Chacun a son propre `eslint.config.mjs`
et son propre `eslint-suppressions.json`, généré une seule fois par
`pnpm exec eslint . --suppress-all` pour geler les erreurs de lint déjà présentes
au moment de sa création. Le job CI `Lint & format` (`pnpm lint`) reste vert tant
qu'aucune violation NOUVELLE n'apparaît sur une règle donnée dans un fichier
donné ; au-delà du nombre gelé, `pnpm lint` échoue.

Emplacements — un fichier de suppressions et un plafond de warnings par package,
le fichier de suppressions étant relatif au `cwd` d'exécution d'`eslint`, pas un
fichier unique à la racine du monorepo :

| Package | Suppressions | Plafond `--max-warnings` |
|---|---|---|
| `apps/platform` | `apps/platform/eslint-suppressions.json` | 119 |
| `packages/shared` | `packages/shared/eslint-suppressions.json` | 0 |
| `packages/supabase` | `packages/supabase/eslint-suppressions.json` | 0 |
| `packages/ui-react` | `packages/ui-react/eslint-suppressions.json` | 0 |

Le plafond `--max-warnings` couvre un angle mort du fichier de suppressions :
celui-ci ne gèle que les erreurs (severity 2), jamais les warnings (severity 1),
qui ne font déjà pas échouer `eslint` par défaut.

## Procédure OBLIGATOIRE après tout lot de correction lint

Dans le dossier du package concerné :

1. `pnpm exec eslint . --prune-suppressions` — retire du JSON les entrées dont
   la violation a été corrigée. Cette étape n'est pas optionnelle : si on la
   saute, `pnpm lint` échoue au prochain run avec le code de sortie **2** et le
   message **"There are suppressions left that do not occur anymore. Consider
   re-running the command with `--prune-suppressions`."** — même si aucune
   violation nouvelle n'existe par ailleurs. C'est le symptôme à reconnaître ;
   la seule réponse correcte est de lancer cette commande, jamais autre chose.
2. Recompter les warnings réels (`pnpm exec eslint .` sans `--max-warnings`,
   lire le total affiché en bas de sortie) et, si des warnings ont disparu,
   baisser `--max-warnings` dans le script `lint` du `package.json` du package
   au nouveau total exact.
3. Committer le `eslint-suppressions.json` mis à jour par l'étape 1 et, le cas
   échéant, le `package.json` mis à jour par l'étape 2.

## Interdictions formelles

- **Ne jamais relancer `--suppress-all` après la mise en place initiale.** Cette
  commande régénère le fichier à partir de TOUT ce qui existe au moment où elle
  tourne. Une violation nouvelle introduite entre-temps par un autre changement
  serait gelée avec les anciennes, et le garde-fou cesserait de la détecter —
  sans erreur, sans signal, silencieusement. Seul `--prune-suppressions` doit
  faire évoluer ces fichiers après la création initiale.
- **Ne jamais ajouter `--pass-on-unpruned-suppressions` aux scripts `lint`.** Ce
  flag ESLint ignore l'alerte de suppressions périmées et repasse en exit 0
  malgré leur présence. L'ajouter désactiverait le seul signal qui rappelle de
  faire l'étape 1 de la procédure ci-dessus.

## Si la CI lint est rouge

Diagnostiquer la cause avant d'agir — trois causes possibles, chacune avec son
propre signal :

- **Violation nouvelle non gelée** : sortie ESLint détaillée avec fichier, ligne
  et règle en cause. → Corriger la violation.
- **Suppression périmée** (code de sortie 2, message ci-dessus) → lancer
  `--prune-suppressions` (étape 1 de la procédure).
- **Plafond de warnings dépassé** (message "ESLint found too many warnings
  (maximum: N)") → un warning de plus est apparu ; le corriger.

Dans les trois cas, élargir les suppressions ou relever un plafond n'est jamais
la réponse par défaut à une CI rouge — ce garde-fou existe précisément pour
empêcher qu'un rouge soit "réparé" en élargissant ce qui est toléré plutôt qu'en
corrigeant ce qui est signalé.
