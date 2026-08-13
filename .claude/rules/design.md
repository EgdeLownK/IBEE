---
paths:
  - "apps/platform/**"
  - "packages/ui-react/**"
---

# Design system IBEE

Source des tokens : `packages/ui-react/src/tokens.css` — bloc `@theme{}` pour
tout ce qui doit générer une classe utilitaire Tailwind (couleurs, rayons,
ombres, breakpoints, polices), bloc `:root{}` pour le reste (espacement,
mouvement, calques, typographie de rôle interne — voir §Polices). Le système
de boutons (`.btn`, `.iconbtn`) vit dans `packages/ui-react/src/controls.css`,
les composants `.ibee-*` dans `packages/ui-react/src/components.css` — les
deux consomment les tokens via `var()`, importés globalement dans
`apps/platform/src/app/globals.css`. Ne jamais lire les valeurs ci-dessous
comme la source de vérité — en cas de divergence, `tokens.css` gagne et cette
règle doit être corrigée.

## Configuration Tailwind (`@source`)

Toute nouvelle source de classes Tailwind (nouveau package workspace scanné,
ex. `packages/ui-react`) doit être déclarée via `@source` dans
`apps/platform/src/app/globals.css`. **L'échec est silencieux** : sans cette
directive, les classes utilitaires du package concerné ne sont simplement pas
générées — pas d'erreur, pas de warning au build, juste un composant qui rend
sans le style attendu. C'est ce qui rend ce piège coûteux à diagnostiquer.

## Vocabulaire autorisé (par rôle)

Deux formes existent pour chaque token, à utiliser selon le fichier :

- **Dans un composant JSX/TSX** → la **classe utilitaire** Tailwind générée
  automatiquement depuis la clé `@theme` (ex. `bg-surface`, `rounded-card`,
  `shadow-card`, `font-display`).
- **Dans un fichier `.css`** (`controls.css`, `profile-styles.css`, etc.) → la
  **variable CSS** directement (`var(--color-surface)`, `var(--radius-card)`,
  `var(--shadow-card)`, `var(--font-display)`). Les classes utilitaires
  Tailwind n'existent pas en dehors du JSX scanné par `@source` — dans un
  fichier `.css` custom, seule la variable est accessible.

**Couleurs de fond**
- `bg-surface` / `var(--color-surface)` — carte/panneau au premier plan (blanc)
- `bg-panel` / `var(--color-panel)` — fond de section, légèrement distinct de la page
- `bg-panel-2` / `var(--color-panel-2)` — fond de section, un cran plus marqué que `panel` (hover, zones actives)
- `bg-background` / `var(--color-background)` — fond de page

**Couleurs de bordure**
- `border-border` / `var(--color-border)` — bordure standard
- `border-border-soft` / `var(--color-border-soft)` — bordure discrète

**Couleurs neutres (texte, icônes, fonds gris)**
- `neutral-0` → `neutral-900` (ex. `bg-neutral-100`, `text-neutral-700`) /
  `var(--color-neutral-100)`, `var(--color-neutral-700)`, … — échelle de gris
  IBEE. Ne jamais utiliser l'échelle `gray-*` de Tailwind à la place, même si
  les valeurs se ressemblent : `neutral-*` est la palette du projet, `gray-*`
  est celle de Tailwind par défaut — deux échelles distinctes qui peuvent
  diverger (elles divergent déjà en valeur exacte, voir §Le piège).

**Couleurs sémantiques**
- `success`, `error`, `warning`, `info` (ex. `bg-success`, `text-error`) /
  `var(--color-success)`, `var(--color-error)`, … — jamais de
  `red-*`/`green-*`/`emerald-*` bruts pour exprimer un état
- `success-soft`/`-strong`, `error-soft`/`-strong`, `warning-soft`/`-strong`,
  `info-soft`/`-strong` (ex. `bg-success-soft`, `text-success-strong`) /
  `var(--color-success-soft)`, … — fond doux + texte appuyé pour badges et
  alertes, même famille que `accent-soft`/`accent-strong`

**Couleur d'accent produit**
- `accent`, `accent-hover`, `accent-soft`, `accent-strong`, `accent-tint`
  (ex. `bg-accent`) / `var(--color-accent)`, `var(--color-accent-hover)`, …

**Couleurs CTA (bouton d'action principal hors système `.btn`)**
- `bg-cta-primary` / `var(--color-cta-primary)` — fond
- `hover:bg-cta-primary-hover` / `var(--color-cta-primary-hover)` — survol

**Rayons (par rôle, jamais par taille)**
- `rounded-card` / `var(--radius-card)` (18px) — cartes, panneaux
- `rounded-field` / `var(--radius-field)` (12px) — champs de formulaire, inputs
- `rounded-pill` / `var(--radius-pill)` (50px) — boutons/pills pleinement arrondis
- `rounded-chip` / `var(--radius-chip)` (30px) — chips, tags
- `rounded-tile` / `var(--radius-tile)` (14px) — tuiles/vignettes

**Ombres**
- `shadow-sm`, `shadow-md`, `shadow-lg` / `var(--shadow-sm)`, `var(--shadow-md)`, `var(--shadow-lg)` — élévation générique
- `shadow-card` / `var(--shadow-card)` — carte au repos
- `shadow-pop` / `var(--shadow-pop)` — élément flottant (popover, dropdown)
- `shadow-nav` / `var(--shadow-nav)` — barres de navigation
- `shadow-shell` / `var(--shadow-shell)` — conteneur applicatif principal

**Polices**
- `font-sans` / `var(--font-sans)` (Roboto) — texte courant
- `font-display` / `var(--font-display)` (Poppins) — titres, boutons
- `font-mono` / `var(--font-mono)` — code/valeurs techniques

## Vocabulaire interdit dans tout code nouveau

| Interdit | Remplacement | Pourquoi |
|---|---|---|
| `bg-white` | `bg-surface` | `surface` peut changer de valeur sans que le code appelant bouge |
| `gray-*` (Tailwind) | `neutral-*` | substitution invisible : mêmes valeurs actuellement, mais deux échelles distinctes qui peuvent diverger |
| `red-*`, `green-*`, `emerald-*` bruts | token sémantique (`error`, `success`, …) | un état doit porter un sens, pas une couleur codée en dur |
| `rounded-sm`/`rounded-md`/`rounded-lg`/`rounded-xl` (échelle Tailwind par taille) | rayon par rôle (`--radius-card`, `--radius-field`, `--radius-pill`, `--radius-chip`, `--radius-tile`) | voir §Le piège ci-dessous |
| Valeurs arbitraires Tailwind (`[22px]`, `[18px]`, `[#d95525]`, …) | le token existant le plus proche par rôle | une valeur arbitraire contourne le design system silencieusement |
| Couleur hexadécimale en dur dans un composant | le token correspondant | perd la cohérence thème + casse toute mise à jour centralisée |
| `--color-amber` (`bg-amber`, …) | `warning` (`--color-warning`) | doublon quasi-identique de `warning` (`#f59e0b` vs `#d97706`) — deux noms pour un seul rôle sémantique, source de confusion sur lequel utiliser |
| `text-xs`/`text-sm`/`text-base`/`text-lg`/`text-xl`/`text-2xl`/`text-3xl`/`text-4xl` (Tailwind, taille brute — y compris préfixé par un variant : `sm:text-lg`, `profile:text-sm`, …) | la classe/variable du token de rôle correspondant (`--type-card-title`, `--type-body-sm`, `--type-control`, `--type-caption`, …) ou, à défaut de composite adapté, `var(--step-*)` directement dans un `.css` de `packages/ui-react` | échelle Tailwind par défaut, pas l'échelle IBEE (`--step-*`) — 360 occurrences mesurées au 2026-08-13, système de rôle remonté d'un cran le même jour : une taille brute ne suit pas cette remontée, silencieusement. **Baseline en mode migration** (voir §Garde-fou CI) : contrairement aux autres motifs de ce tableau (dette historique gelée), celui-ci a un objectif explicite de décroissance — Killian a décidé la migration complète, ce garde-fou empêche seulement la dérive pendant qu'elle se fait progressivement. |

## Le piège : plusieurs noms Tailwind standards ont une valeur différente ici

`tokens.css` redéfinit plusieurs clés `@theme` qui portent le **même nom**
qu'un token par défaut de Tailwind, mais avec une **valeur différente**. Se
fier à la valeur par défaut mémorisée (connaissance Tailwind standard) donne
donc un résultat faux dans ce projet — pas juste "un peu différent", parfois
un seuil ou une taille clairement décalés.

**Rayons** (déjà interdits en tant que noms de taille, voir table ci-dessus —
détail du décalage) :

| Nom | Valeur IBEE | Valeur Tailwind par défaut |
|---|---|---|
| `--radius-sm` | 6px | 4px (`0.25rem`) |
| `--radius-md` | 12px | 6px (`0.375rem`) |
| `--radius-lg` | 16px | 8px (`0.5rem`) |
| `--radius-xl` | 24px | 12px (`0.75rem`) |

Concrètement : `--radius-xl` vaut **24px**, alors que `rounded-2xl` (le
défaut Tailwind, censé être la valeur la plus proche de 24px dans l'échelle
standard) vaut **16px**. Toute l'échelle de rayons IBEE est décalée de deux
crans par rapport à l'intuition Tailwind standard — se fier au nom de taille
Tailwind mémorisé donne systématiquement un rayon trop petit.

C'est pourquoi les noms de **taille** (`sm`, `md`, `lg`, `xl`, `2xl`) sont
interdits en dehors de `tokens.css` lui-même : utiliser exclusivement les
noms de **rôle** (`--radius-card`, `--radius-field`, `--radius-pill`,
`--radius-chip`, `--radius-tile`), qui ne dépendent pas de la mémoire de
l'échelle par défaut.

**Breakpoint `lg`** : `--breakpoint-lg` vaut **1200px** dans ce projet, alors
que le défaut Tailwind (`lg:`) vaut **1024px** (`64rem`). Écrire `lg:` en se
fiant à la connaissance standard de Tailwind fait donc apparaître le
comportement `lg:` 176px trop tard — un layout testé "en desktop" entre
1024px et 1200px peut sembler cassé alors que le code est correct : c'est
juste que `lg:` ne s'est pas encore déclenché dans ce projet. Vérifier
`--breakpoint-profile` (800px, seuil custom sans équivalent Tailwind) plutôt
que de deviner un seuil standard pour toute mise en page profil.

**Typographie de rôle (`--step-*`)** : Tailwind expose par défaut ses propres
classes `text-xs`/`text-sm`/`text-lg`/`text-xl`/`text-2xl` avec sa propre
échelle (`text-lg` = 18px par défaut Tailwind). Le système de rôle IBEE
(titre de page, titre de carte, corps, libellé, contrôle, légende — composés
dans `--type-*`) n'utilise donc jamais le nom `--text-*` : il est nommé
`--step-*` (`--step-lg`, `--step-xl`, …), volontairement hors `@theme`,
précisément pour ne jamais prendre la place de l'échelle Tailwind par
défaut. Nommer un token de rôle `--text-lg` aurait changé silencieusement la
valeur de la classe Tailwind `text-lg` déjà utilisée dans le code (16px IBEE
vs 18px Tailwind), sans qu'aucune nouvelle classe n'apparaisse dans un diff
JSX — même mécanisme que le piège des rayons ci-dessus. `--step-*` n'alimente
que `--type-*`, consommé via `var()` dans un `.css`, jamais comme classe
Tailwind directe.

**Mesure réelle (2026-08-13)** : l'échelle Tailwind par défaut (`text-xs`…
`text-4xl` bruts, hors du système `--step-*`) est utilisée **~9× plus souvent**
que le système de rôle dans le code actuel — 360 occurrences contre 39. Ce
n'est donc pas un cas marginal : c'est le mode de sizing dominant de
l'application aujourd'hui, y compris dans `packages/ui-react` lui-même (62%
de ses fichiers `.tsx`). Migration décidée par Killian, garde-fou de
non-régression en place (§Garde-fou CI ci-dessous) — la migration elle-même
n'a pas encore commencé.

**Autres écarts audités dans `tokens.css`** (mêmes noms que Tailwind par
défaut, valeurs différentes — moins piégeux car ils ne faussent pas un calcul
de seuil ou de taille, mais à connaître) :

| Nom | Écart |
|---|---|
| `--shadow-sm` / `--shadow-md` / `--shadow-lg` | valeurs IBEE nettement plus discrètes que les ombres par défaut Tailwind |
| `--font-sans` / `--font-mono` | pile de police IBEE (Roboto / ui-monospace, monospace) au lieu de la pile système par défaut Tailwind — customisation volontaire, pas une erreur |
| `--color-neutral-50` → `--color-neutral-900` | valeurs hex IBEE au lieu de l'échelle `oklch` par défaut Tailwind — c'est précisément pour cette divergence que `gray-*` est interdit au profit de `neutral-*` (voir table ci-dessus) |

Aucun autre token du bloc `@theme` de `tokens.css` ne partage un nom avec un
token par défaut Tailwind (`--radius-card`, `--breakpoint-profile`,
`--color-accent`, etc. sont tous des noms propres au projet, sans
collision) — c'est précisément pour cette raison que la typographie de rôle
est nommée `--step-*` plutôt que `--text-*` (voir ci-dessus), et que
`--color-slate-*` (autre nom de palette Tailwind par défaut, 0 usage réel
vérifié dans le repo) reste lui aussi dans le bloc `:root`, hors `@theme`.

## Rayons concentriques

Quand une image est encastrée dans une carte avec une marge intérieure :

```
rayon extérieur (carte) = rayon intérieur (image) + marge
```

Sans cette règle, les deux arrondis ne sont pas concentriques et l'écart de
marge entre l'image et le bord de la carte varie visuellement selon l'angle.

## Espacements

`tokens.css` ne redéfinit **pas** `--spacing` (confirmé : aucune clé
`--spacing*` dans le bloc `@theme` du projet) — l'échelle d'espacement
Tailwind par défaut (`--spacing: 0.25rem`, donc `p-4` = 16px, etc.) s'applique
telle quelle, sans piège de décalage.

Les classes `p-*`, `m-*`, `gap-*` (et variantes `px-`, `py-`, `space-x-`,
`space-y-`, …) standard Tailwind sont donc du **vocabulaire autorisé**, à
utiliser librement pour tout espacement courant (marges, paddings, gaps).

**La clause d'escalade ne s'applique pas aux marges/espacements courants.**
Elle vise les tokens de rôle (couleur, rayon, ombre) où une valeur arbitraire
contournerait une décision de design déjà prise. L'espacement Tailwind
standard n'a pas cette contrainte — sans cette précision, la clause
d'escalade se déclencherait à chaque `p-3` ou `gap-2`, ce qui n'est pas
l'intention.

## Boutons

`.btn--block` (largeur 100%) existe déjà comme modificateur du système, mais
est actuellement défini dans `packages/ui-react/src/profile/detail-styles.css`
plutôt que dans `controls.css` — un rapatriement dans `controls.css` est
prévu pour que tous les modificateurs `.btn*` vivent au même endroit. En
attendant, il reste utilisable (`class="btn btn--dark btn--block"`),
simplement pas co-localisé avec le reste du système.

Tout bouton utilise le système `.btn` (+ modificateur `.btn--accent`,
`.btn--dark`, `.btn--ghost`, ou `.btn--sm` pour la taille compacte) ou
`.iconbtn` pour les boutons icône seule, défini dans
`packages/ui-react/src/controls.css` et importé globalement via
`apps/platform/src/app/globals.css`.

Ne jamais restyler un `<button>` au cas par cas (classes Tailwind ad hoc,
styles inline). Si aucune variante existante ne convient, voir la clause
d'escalade ci-dessous — ne pas en créer une localement.

## Debug CSS

- **Coin/bord rogné ou tronqué** → vérifier `overflow: hidden` + `border-radius`
  sur un **conteneur parent** : un enfant pleine largeur dont un bord touche le
  bord du parent voit ses coins clippés par le radius du parent.
- Avant de styler un élément, lire le CSS de **son conteneur** : reliquats
  (`overflow`, `border-radius`, `::before`, `z-index`) d'un ancien design
  cassent souvent l'affichage.

## Clause d'escalade (la plus importante)

Si un besoin visuel n'entre dans **aucun** token existant (couleur, rayon,
ombre, taille) :

1. **Ne pas inventer de valeur.**
2. **Ne pas utiliser de valeur arbitraire** (`[22px]`, couleur hex en dur, etc.).
3. **S'arrêter** et décrire précisément le besoin à Killian (où, pourquoi,
   quelle valeur semblerait nécessaire).
4. **Demander quel token créer** — un nouveau token est une décision de
   design produit, pas un détail d'implémentation technique. Killian
   tranche ; l'ajout se fait ensuite dans `tokens.css`, jamais dans un
   composant.

## Garde-fou CI

Le vocabulaire interdit ci-dessus est vérifié automatiquement par
`scripts/design-guard.mjs`, branché dans le job CI « Lint & format » via
`pnpm design:check`. Même doctrine que le garde-fou lint
(`.claude/rules/lint.md`) : l'existant est gelé, seule une **augmentation**
du nombre d'occurrences fait échouer la CI.

**Périmètre** : `apps/platform/src` et `packages/ui-react/src` (`.ts`/`.tsx`).
`packages/shared` est hors scope (logique métier pure, pas de JSX/Tailwind).

**Motifs vérifiés** : `bg-white`, `gray-*`, `red-*`/`green-*`/`emerald-*`/`amber-*`
bruts, `rounded-sm|md|lg|xl|2xl|3xl`, couleur/rayon en valeur arbitraire
(`bg-[#...]`, `rounded-[...]`, etc. — **zéro tolérance**, aucune occurrence
gelée), couleur hexadécimale en dur dans un `.tsx`, `text-xs|sm|base|lg|xl|
2xl|3xl|4xl` Tailwind bruts (motif fermé sur ces 8 mots-clés exacts — ne
capture ni la couleur `text-neutral-500`, ni l'alignement `text-center`, ni
le wrap `text-nowrap`, aucun de ces suffixes ne correspondant à un mot-clé de
taille). `text-white` est volontairement exclu : légitime comme texte de
contraste sur fond sombre/accent, ce n'est pas un contournement de
`bg-surface`.

**Seuil gelé** : `design-guard-baseline.json` à la racine, compté par couple
fichier + motif (pas par ligne exacte — insensible aux décalages de ligne dus
à des éditions sans rapport, comme `eslint-suppressions.json`).

**Allowlist** : dans `scripts/design-guard.mjs`, par **couple fichier + motif**
uniquement, jamais par fichier entier — un fichier autorisé pour le hex en dur
(génération d'image Open Graph via `next/og`, config couleur de QR code : deux
cas où le rendu sort de la cascade CSS et ne peut pas résoudre `var(--color-*)`)
reste vérifié normalement sur tous les autres motifs.

**Vérifier localement** : `pnpm design:check`

**Procédure après un lot de correction** : une fois des occurrences
corrigées dans le code, régénérer la baseline avec
`node scripts/design-guard.mjs --update-baseline`, puis committer le
`design-guard-baseline.json` mis à jour. Jamais automatique, jamais depuis
la CI — geste délibéré après une vraie correction.

**Piège vérifié** : `--update-baseline` régénère TOUT le fichier depuis un
scan frais (pas d'ajout incrémental) — un lot de correction sur un motif
fait donc apparaître dans le diff toute dérive silencieuse des AUTRES
motifs depuis la dernière régénération (comptes qui auraient dû baisser
suite à une correction antérieure jamais suivie de cette procédure).
Vérifié en pratique le 2026-08-13 : plusieurs fichiers de
`components/dashboard/talent` et `components/public/jobs` avaient des
violations `bg-white`/`rounded-<taille>`/couleur déjà corrigées dans le code
sans que la baseline n'ait jamais été régénérée pour le refléter. Un diff de
baseline qui ne touche QUE des baisses (jamais des hausses) sur des motifs
non concernés par le lot en cours est donc attendu et sain — à vérifier motif
par motif avant de committer (jamais une hausse non expliquée), pas à
supposer suspect par défaut.

**Interdiction formelle** : ne jamais élargir la baseline ni l'allowlist pour
faire passer une CI rouge. Ce garde-fou existe précisément pour empêcher
qu'un rouge soit « réparé » en élargissant ce qui est toléré plutôt qu'en
corrigeant ce qui est signalé — même doctrine que `eslint-suppressions.json`
(voir `.claude/rules/lint.md` §Interdictions formelles). Un ajout à
l'allowlist ne se justifie que par une contrainte technique réelle (rendu
hors cascade CSS), jamais par la pression d'un CI rouge à débloquer vite.
