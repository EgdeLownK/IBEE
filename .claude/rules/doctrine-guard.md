---
paths:
  - "scripts/context-guard.mjs"
---
# Garde-fou CI doctrine (chemins morts)

`scripts/context-guard.mjs`, branché en CI via `pnpm context:check` dans le
job « Lint & format » (`.github/workflows/ci.yml`). Détecte toute référence
à un fichier/dossier introuvable dans la doctrine vivante : `CLAUDE.md`
racine et de packages, `.claude/rules/**`, `.claude/agents/**`,
`docs/produit.md`. Contexte : un audit a trouvé plusieurs références à des
chemins supprimés (ex. `.ibee-brain/_IBEE.md` cité dans des règles écrites
avant la migration vers `.claude/rules/produit.md`) — une règle qui cite un
chemin mort est suivie avec confiance par un agent qui ne peut pas savoir
qu'il n'existe plus.

**Vérifier localement** : `pnpm context:check`

## Tolérance zéro, pas de baseline

Contrairement à `design-guard.mjs`/`eslint-suppressions.json` (l'existant
est gelé, seule une régression fait échouer la CI), ce garde-fou n'a pas de
seuil : **toute** référence morte fait échouer le job, y compris celles déjà
présentes avant ce garde-fou. Pas de geste d'initialisation à faire tourner,
pas de fichier de comptage à maintenir.

## Deux catégories — ne pas les confondre

1. **Chemin inexistant** — le fichier/dossier n'existe nulle part, ni en
   local ni en CI (renommé, déplacé, supprimé sans mise à jour de la
   doctrine). Erreur réelle : corriger la référence dans le fichier de
   doctrine.
2. **Chemin gitignored mais réel** — le fichier existe réellement (en local
   chez Killian, ou par convention sur toute machine de dev) mais git ne le
   track jamais par conception (voir `.gitignore`) : `git ls-files` ne le
   verra donc jamais, ni en local ni en CI, alors que la référence de
   doctrine est légitime. Ce n'est **pas** un chemin mort.
   - Exemple : `apps/platform/.env.local` (convention locale, jamais
     commité) — référencé à raison dans `.claude/rules/secrets.md` et
     `apps/platform/CLAUDE.md`.
   - Exemple : `.ibee-brain/_IBEE.md`, `_BRAIN-RULES.md`, `_BRAIN-DEV.md`
     (gitignored, existent en local chez Killian) — `.claude/rules/guardrails.md`
     les nomme précisément pour interdire leur modification sans accord
     explicite : les nommer est le but même de cette règle-là, pas une
     référence morte.

Seule la catégorie 2 justifie une exception. Elle se déclare dans le tableau
`EXCEPTIONS` de `scripts/context-guard.mjs`, **par couple (fichier, chemin)
précis**, jamais par motif de dossier générique — une exception du type
`.ibee-brain/**` recréerait exactement l'angle mort que ce garde-fou existe
pour fermer (n'importe quelle nouvelle référence, morte ou non, sous ce
préfixe serait alors silencieusement ignorée).

## Pourquoi `git ls-files` et pas le filesystem

L'existence d'un chemin est vérifiée contre les fichiers trackés par git
(`git ls-files`), jamais via `fs.existsSync`. Un dossier gitignored comme
`.ibee-brain/` peut exister en local chez Killian sans jamais être présent
dans un checkout CI frais (`actions/checkout` ne récupère que les fichiers
trackés) — vérifier contre le filesystem brut donnerait un résultat
différent en local et en CI, ce qui est précisément le bug que ce garde-fou
doit éviter de reproduire sur lui-même.

## Interdiction formelle

Ne jamais élargir `ROOT_ANCHORS`, la regex d'extraction, ou ajouter une
exception par motif de dossier pour faire passer une CI rouge — même
doctrine que `eslint-suppressions.json` (voir `.claude/rules/lint.md`
§Interdictions formelles) et l'allowlist de `design-guard.mjs` (voir
`.claude/rules/design.md` §Garde-fou CI). Un chemin mort se corrige en
corrigeant la référence ; une exception catégorie 2 se justifie uniquement
par un fichier réellement gitignored-mais-réel, jamais par la pression d'un
rouge à débloquer vite.
