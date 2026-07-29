// Garde-fou CI doctrine — détecte toute référence à un fichier ou dossier
// INEXISTANT dans la doctrine vivante (CLAUDE.md racine + packages,
// .claude/rules/**, .claude/agents/**, docs/produit.md).
//
// Contexte : un audit a trouvé une dizaine de références à des chemins
// supprimés dans la doctrine (ex. .ibee-brain/_IBEE.md, migré vers
// .claude/rules/produit.md sans que guardrails.md soit mis à jour). Une
// règle qui cite un chemin mort est suivie avec confiance — ce garde-fou
// fait échouer la CI dès qu'une nouvelle référence de ce type apparaît.
//
// Deux catégories à ne pas confondre (voir §Exceptions déclarées plus bas) :
// un chemin INEXISTANT (erreur réelle, à corriger) et un chemin GITIGNORED
// MAIS RÉEL (référence légitime à un fichier qui existe en local sans être
// tracké par git — ex. .env.local, ou .ibee-brain/ pour Killian). Seul le
// second cas justifie une exception, toujours nommée par couple
// fichier+chemin, jamais par motif de dossier.
//
// Modèle : scripts/design-guard.mjs, mais SANS baseline — tolérance zéro
// (voir .claude/rules/doctrine-guard.md). Toute référence introuvable fait
// échouer le job, immédiatement, pas seulement les régressions.
//
// Existence vérifiée via `git ls-files`, jamais via le filesystem brut :
// un fichier ignoré par git (ex. .ibee-brain/, gitignored) peut exister en
// local chez Killian sans jamais être présent dans un checkout CI — utiliser
// fs.existsSync donnerait un résultat différent en local et en CI, ce qui
// est précisément le bug que ce garde-fou doit éviter de reproduire sur
// lui-même.

import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '..')

function toPosix(p) {
  return p.split(path.sep).join('/')
}

// --- Fichiers trackés par git : source de vérité pour l'existence -----
// (voir commentaire d'en-tête — jamais fs.existsSync).
const trackedFiles = execFileSync('git', ['ls-files'], { cwd: rootDir, encoding: 'utf8' })
  .split('\n')
  .filter(Boolean)
  .map(toPosix)

const trackedFileSet = new Set(trackedFiles)
// Tous les préfixes de dossier de chaque fichier tracké, pour vérifier
// l'existence d'un DOSSIER (git ne track que des fichiers, pas des dossiers).
const trackedDirSet = new Set()
for (const f of trackedFiles) {
  const parts = f.split('/')
  for (let i = 1; i < parts.length; i++) {
    trackedDirSet.add(parts.slice(0, i).join('/'))
  }
}

function pathExists(p) {
  const norm = p.replace(/\/+$/, '')
  return trackedFileSet.has(norm) || trackedDirSet.has(norm)
}

// --- Périmètre : doctrine vivante --------------------------------------
// EXCLU explicitement : supabase/migrations/** et docs/plans/** — historique
// figé, ces fichiers citeront toujours des chemins disparus (tables
// renommées, fichiers déplacés depuis) et ce n'est pas une erreur à
// corriger. Aucun des deux n'est de toute façon dans la liste de fichiers
// scannés ci-dessous ; ce filtre est une sécurité si le périmètre est élargi
// un jour (ex. scan de tout docs/**).
const EXCLUDED_SOURCE_PREFIXES = ['supabase/migrations/', 'docs/plans/']

function isExcludedSource(relFile) {
  return EXCLUDED_SOURCE_PREFIXES.some((prefix) => relFile.startsWith(prefix))
}

function findDoctrineFiles() {
  const files = [path.join(rootDir, 'CLAUDE.md'), path.join(rootDir, 'apps/platform/CLAUDE.md')]

  const packagesDir = path.join(rootDir, 'packages')
  for (const name of fs.readdirSync(packagesDir)) {
    const claudeMd = path.join(packagesDir, name, 'CLAUDE.md')
    if (fs.existsSync(claudeMd)) files.push(claudeMd)
  }

  files.push(path.join(rootDir, 'docs/produit.md'))

  for (const dir of ['.claude/rules', '.claude/agents']) {
    const abs = path.join(rootDir, dir)
    for (const name of fs.readdirSync(abs)) {
      if (name.endsWith('.md')) files.push(path.join(abs, name))
    }
  }

  return files
    .map((f) => toPosix(path.relative(rootDir, f)))
    .filter((relFile) => !isExcludedSource(relFile))
}

// --- Un CLAUDE.md de package référence ses propres fichiers en relatif
// (`src/types.ts`), pas depuis la racine du repo. Résolu contre le dossier
// du fichier de doctrine lui-même, jamais deviné autrement.
function packageRelativeDir(relFile) {
  const isRootLevel = relFile === 'apps/platform/CLAUDE.md'
  const isPackageLevel = /^packages\/[^/]+\/CLAUDE\.md$/.test(relFile)
  if (!isRootLevel && !isPackageLevel) return null
  return path.posix.dirname(relFile)
}

// --- Extraction des chemins candidats -----------------------------------
//
// Un candidat doit contenir au moins un "/" (les noms de fichiers nus comme
// `types.ts` ou `package.json` sont hors périmètre — trop ambigus, faux
// positifs garantis, voir .claude/rules/doctrine-guard.md).
//
// La classe de caractères autorisée exclut volontairement `*`, `?`, `{`,
// `}` : un motif glob de frontmatter (`apps/platform/**`, `*.{ts,tsx}`) ou
// une mention illustrative (`packages/supabase/src/*`) s'arrête donc net
// AVANT le caractère glob plutôt que d'être capturé en entier — le préfixe
// restant (`apps/platform`) est un vrai dossier, vérifié normalement, sans
// jamais évaluer le motif glob lui-même.
//
// `[` `]` `(` `)` restent AUTORISÉS dans les segments suivants : ce sont des
// noms de dossier Next.js réels sur disque dans ce repo (`[slug]`,
// `(public)`), pas des métacaractères glob ici — les exclure produirait
// l'effet inverse (rater de vraies routes comme
// `apps/platform/src/app/(public)/[slug]/...`).
//
// `(?<!@)` : sans ce lookbehind, un paquet npm scopé comme
// `@supabase/supabase-js` matcherait `supabase/supabase-js` une fois le `@`
// hors classe de caractères — et `supabase` est un vrai dossier top-level du
// repo (migrations, tests…), donc ce candidat serait vérifié et signalé à
// tort comme mort. Le lookbehind exclut tout token précédé d'un `@`.
const PATH_TOKEN_RE = /(?<!@)[A-Za-z0-9_.-]+(?:\/[A-Za-z0-9_.\-()[\]]+)+/g

// Dossiers top-level réels du repo vers lesquels un chemin de doctrine peut
// légitimement pointer. Sert à distinguer un vrai chemin d'une paire de mots
// séparés par "/" dans la prose (`SEO/GEO/AEO`, `oui/non`, `add/alter/fix`)
// ou d'un nom de paquet non scopé (`next/og`) : aucun de ces tokens ne
// commence par une de ces racines, donc aucun n'est jamais vérifié.
const ROOT_ANCHORS = new Set([
  'apps',
  'packages',
  'supabase',
  'docs',
  'scripts',
  '.claude',
  '.github',
  '.ibee-brain',
])

// --- Exceptions déclarées : couple (fichier, chemin) --------------------
//
// Deux catégories bien distinctes trouvées dans cette doctrine — ne pas les
// confondre :
//
// 1. « Chemin inexistant » — le fichier/dossier n'existe nulle part, ni en
//    local ni en CI (renommé, déplacé, supprimé sans mise à jour de la
//    doctrine). C'est une vraie erreur : le garde-fou doit la signaler,
//    jamais l'excepter.
// 2. « Chemin gitignored mais réel » — le fichier existe réellement (en
//    local chez Killian, ou par convention sur toute machine de dev), git
//    ne le track jamais par conception (voir .gitignore), donc `git
//    ls-files` ne le verra jamais — ni en local ni en CI. La référence de
//    doctrine est légitime, ce n'est PAS un chemin mort : exception nommée.
//
// Dans les deux cas : exception déclarée par COUPLE (fichier, chemin) précis
// avec sa raison, jamais par motif de dossier générique (`.ibee-brain/**`
// en exception large re-créerait exactement l'angle mort que ce garde-fou
// existe pour fermer — voir .claude/rules/doctrine-guard.md §Interdiction
// formelle).
const EXCEPTIONS = [
  {
    file: '.claude/rules/secrets.md',
    resolvedPath: 'apps/platform/.env.local',
    reason:
      'catégorie 2 — fichier local gitignored (.env.local, voir .gitignore) : jamais tracké ni présent en CI par construction, la doctrine documente correctement une convention locale.',
  },
  {
    file: 'apps/platform/CLAUDE.md',
    resolvedPath: 'apps/platform/.env.local',
    reason: 'catégorie 2 — même raison, apps/platform/.env.local.',
  },
  {
    file: '.claude/rules/guardrails.md',
    resolvedPath: '.ibee-brain/_IBEE.md',
    reason:
      'catégorie 2 — .ibee-brain/ est gitignored par conception (voir .gitignore) mais existe réellement en local chez Killian ; ce garde-fou nomme précisément ce fichier pour en interdire la modification sans accord explicite — le nommer est le but même de la règle, pas une référence morte.',
  },
  {
    file: '.claude/rules/guardrails.md',
    resolvedPath: '.ibee-brain/_BRAIN-RULES.md',
    reason: 'catégorie 2 — même raison que _IBEE.md ci-dessus.',
  },
  {
    file: '.claude/rules/guardrails.md',
    resolvedPath: '.ibee-brain/_BRAIN-DEV.md',
    reason: 'catégorie 2 — même raison que _IBEE.md ci-dessus.',
  },
  {
    file: '.claude/rules/doctrine-guard.md',
    resolvedPath: '.ibee-brain/_IBEE.md',
    reason:
      'catégorie 2 — cité en exemple illustratif dans la doctrine de ce garde-fou lui-même (le cas source est .claude/rules/guardrails.md, voir exceptions ci-dessus).',
  },
  {
    file: '.claude/rules/doctrine-guard.md',
    resolvedPath: 'apps/platform/.env.local',
    reason:
      'catégorie 2 — cité en exemple illustratif dans la doctrine de ce garde-fou lui-même (le cas source est .claude/rules/secrets.md, voir exceptions ci-dessus).',
  },
  {
    // Couvre les 2 occurrences de docs/produit.md (lignes 3 et 9) — même
    // fichier cible, l'exception se déclare par couple (fichier, chemin),
    // pas par ligne : une seule entrée suffit pour les deux mentions.
    file: 'docs/produit.md',
    resolvedPath: '.ibee-brain/_IBEE.md',
    reason:
      'catégorie 2 — même fichier et même raison que les exceptions guardrails.md ci-dessus : gitignored par conception, présent en local chez Killian, référence légitime expliquant la provenance du contenu migré (§4/§9 délibérément laissés hors dépôt, voir docs/produit.md en-tête).',
  },
]

function isException(relFile, resolvedPath) {
  return EXCEPTIONS.some((e) => e.file === relFile && e.resolvedPath === resolvedPath)
}

function scanFile(absFile) {
  const relFile = toPosix(path.relative(rootDir, absFile))
  const pkgRelDir = packageRelativeDir(relFile)
  const content = fs.readFileSync(absFile, 'utf8').replace(/\r\n/g, '\n')
  const lines = content.split('\n')
  const findings = []

  lines.forEach((lineText, index) => {
    const regex = new RegExp(PATH_TOKEN_RE.source, 'g')
    let match
    while ((match = regex.exec(lineText))) {
      let token = match[0]
      // Un vrai chemin ne se termine jamais par un point littéral — c'est
      // presque toujours la ponctuation de fin de phrase collée au token
      // (mention hors backticks).
      token = token.replace(/\.+$/, '')
      if (token.includes('://')) continue

      const firstSeg = token.split('/')[0]
      let resolved = null

      if (ROOT_ANCHORS.has(firstSeg)) {
        resolved = token
      } else if (firstSeg === 'src' && pkgRelDir) {
        resolved = `${pkgRelDir}/${token}`
      } else {
        continue
      }

      if (isException(relFile, resolved)) continue

      if (!pathExists(resolved)) {
        findings.push({ file: relFile, line: index + 1, token, resolved })
      }
    }
  })

  return findings
}

const findings = findDoctrineFiles().flatMap((f) => scanFile(path.join(rootDir, f)))

if (findings.length === 0) {
  console.log('[context-guard] OK — aucune référence morte dans la doctrine vivante.')
  process.exit(0)
}

console.error('[context-guard] Référence(s) à un chemin introuvable dans la doctrine :\n')
for (const f of findings) {
  console.error(`  ${f.file}:${f.line}  "${f.token}" → chemin introuvable : ${f.resolved}`)
}
console.error(
  '\nCorriger la référence dans le fichier de doctrine (chemin déplacé/renommé/supprimé),',
)
console.error(
  'ou si le chemin est légitimement hors dépôt, déclarer une exception nommée (fichier + chemin,',
)
console.error(
  'avec sa raison) dans scripts/context-guard.mjs — jamais élargir ROOT_ANCHORS ni la regex',
)
console.error('pour faire passer la CI. Voir .claude/rules/doctrine-guard.md.')
process.exit(1)
