# Notes design-sync — @ibee/ui-react

## Particularités de ce repo

- **`packages/ui-react` n'a aucun script `build`.** `package.json` `exports['.']`
  pointe directement sur `./src/index.ts` (TypeScript brut) — le package est
  consommé tel quel par `apps/platform` (Next.js compile lui-même le
  workspace package). Pas de `dist/` livré. **On n'a pas ajouté de script
  `build`** (risque CI/turbo hors scope de cette sync) — à la place :
  - `resolveDistEntry` trouve quand même une entrée valide car
    `exports['.']` pointe vers un fichier qui existe (`src/index.ts`) —
    `synthEntry` reste `false`, esbuild compile directement ce `.ts`.
  - Les `.d.ts` réels sont générés à part par un `tsc --emitDeclarationOnly`
    ponctuel (voir `cfg.buildCmd`), écrits dans `packages/ui-react/dist/`
    (gitignored). `findTypesRoot` détecte `dist/` automatiquement (a des
    `.d.ts`) — aucune modif de `package.json` (`types`/`typings`) requise.
  - **Important** : `exportedNames` (la liste "sanity-check" des exports)
    cherche `<PKG_DIR>/index.d.ts` à la racine du package, qui n'existe
    jamais dans ce setup (seul `dist/index.d.ts` existe) → elle renvoie un
    set vide. C'est sans conséquence : la liste des composants vient
    entièrement de `cfg.componentSrcMap` (13 entrées pinnées à la main), pas
    de la découverte automatique. Si le build log affiche un warning lié à
    l'export scan lossy, c'est attendu — ne pas chercher à le corriger.

- **Aucun CSS compilé livré.** Les composants utilisent massivement des
  classes utilitaires Tailwind v4 (`bg-surface`, `rounded-card`,
  `max-w-[800px]`, …) définies via le bloc `@theme` de
  `packages/ui-react/src/tokens.css`. Ces classes n'existent qu'après
  compilation Tailwind — normalement faite par le build Next.js de
  `apps/platform` (`apps/platform/src/app/globals.css`). `.design-sync/
  tailwind-build.mjs` rejoue cette compilation (mêmes `@import` de CSS bruts
  + mêmes `@source` sur `packages/ui-react/src`, MAIS sans les fichiers
  spécifiques à `apps/platform/src` ni le `@theme` de surcharge des polices
  Next.js) vers `packages/ui-react/dist/tailwind-compiled.css`
  (`cfg.cssEntry`). Généré via `@tailwindcss/postcss` résolu depuis
  `apps/platform/node_modules` (dépendance transitive `postcss` résolue via
  `createRequire` sur le chemin du plugin, pas sur `apps/platform` lui-même
  — pnpm isole les node_modules). L'entrée temporaire doit vivre sous
  `apps/platform/` (`.design-sync-tailwind-entry.css`, gitignored) pour que
  `@import 'tailwindcss'` résolve via le symlink pnpm local — à la racine du
  repo ce symlink n'existe pas.

- **Polices** : `tokens.css` déclare `--font-sans: 'Roboto', 'Inter Variable',
  system-ui, sans-serif` et `--font-display: 'Poppins', 'Roboto', 'Inter
  Variable', sans-serif`. Roboto et Poppins sont chargées par
  `next/font/google` dans `apps/platform/src/app/layout.tsx`
  (auto-hébergement au build Next.js — aucun `.woff2` n'existe dans le repo
  à embarquer). **Décision (validée avec Killian, 2026-08-03)** :
  `.design-sync/fonts-build.mjs` télécharge Roboto (300/400/500/700) et
  Poppins (400/500/600/700) depuis Google Fonts (licence OFL, redistribution
  libre) — mêmes poids que `layout.tsx`, subset latin uniquement. Sortie
  `packages/ui-react/dist/fonts/{*.woff2,fonts.css}`, câblée via
  `cfg.extraFonts`. **Piège rencontré** : un User-Agent moderne fait servir
  par l'API Google Fonts un seul fichier woff2 variable partagé entre les 4
  poids de Roboto (les `@font-face` déclarent un `font-weight` fixe, pas une
  plage → tous les poids auraient rendu visuellement identiques). Un
  User-Agent pré-variable-fonts (`Chrome/60`) force des fichiers statiques
  distincts par poids — voir le commentaire en tête de
  `fonts-build.mjs`. "Inter Variable" (fallback secondaire dans la pile) n'a
  jamais été une police réellement servie nulle part dans le repo — non
  sourcée, acceptée telle quelle (le fallback système `sans-serif` prend le
  relais si Roboto/Poppins manquent).

- **Monorepo pnpm** : `--node-modules apps/platform/node_modules` (symlinks
  `@ibee/ui-react` → `packages/ui-react`, `react`/`react-dom`/`@types/react`
  présents). `packages/ui-react/node_modules` n'a pas de self-symlink, donc
  ne PAS pointer `--node-modules` dessus.

- Aucun import `next/*` ni `@ibee/*` (packages/shared, packages/supabase)
  dans `packages/ui-react/src` — vérifié par grep avant de commencer, pas de
  risque `[WORKSPACE_SIBLING]` ni de dépendance Next.js irrésolvable.

## Known render warns

- `[TOKENS_MISSING]` sur `--text-muted`, `--text`, `--border`, `--surface`,
  `--success`, `--error` : ces variables (sans préfixe `--color-`) sont
  référencées dans `packages/ui-react/src/dashboard/activite-styles.css`
  mais ne sont définies nulle part dans le repo — `tokens.css` utilise
  systématiquement le préfixe `--color-*` (`--color-text-muted`, etc., voir
  `.claude/rules/design.md`). **Probable bug pré-existant dans l'app** (CSS
  mort ou legacy), sans rapport avec cette sync : `activite-styles.css` ne
  sert aucun des 13 composants synchronisés (styles de page dashboard, pas
  de composant). Signalé à Killian dans le rapport de fin de sync — pas
  corrigé ici (hors scope).

## Composants overlay/hors-flux — fix `.ds-single` sans hauteur

`AvatarCropperModal` (`fixed inset-0` plein écran) rendait **coupé en haut**
en preview solo malgré `cardMode: "single"` + `viewport` déclaré. Cause : le
wrapper `.ds-single` du harness de preview n'a **aucun contenu en flux
normal** quand le composant racine est lui-même `position: fixed` (il est
retiré du flux) — sa hauteur `auto` s'effondre à ~0, et `inset: 0` (donc le
centrage flex) se résout contre un containing block quasi nul au lieu du
viewport déclaré. **Fix** : dans le fichier preview lui-même (composition,
pas modification du composant réel), envelopper le composant dans un `<div
style={{ minHeight: <viewport height> }}>` — un frère en flux normal donne
au wrapper une hauteur réelle contre laquelle `inset-0` peut se résoudre.
Voir `.design-sync/previews/AvatarCropperModal.tsx`. **Applicable à tout
futur composant overlay/modal** ajouté à ce design system — pas seulement
`AvatarCropperModal`.

`ProfileHeroReact` (image hero `aspect-square w-full` + bloc texte en
dessous) dépassait le viewport de capture par défaut (900×700) — le texte
n'était jamais capturé (hors cadre). Fix simple : `cfg.overrides
.ProfileHeroReact.viewport = "900x1150"` (pas besoin de `cardMode: "single"`
ici, ce n'est pas un conflit de grille — juste plus de hauteur).

## Composant à état interne piloté par clic (dropdown/popover) — pattern

`PublicationActionsMenu` n'a pas de prop pour contrôler son ouverture (state
interne `useState`) — un premier build le montrait `[RENDER_BLANK]` (menu
fermé par défaut, rien à voir). Fix : dans la preview, un `useEffect` qui
déclenche un vrai clic DOM programmatique sur le bouton trigger
(`document.querySelector('button[aria-label="..."]')?.click()`) — ça
fonctionne parce que le render check exécute du vrai JS dans un vrai
Chromium (Playwright), pas un snapshot statique. Voir
`.design-sync/previews/PublicationActionsMenu.tsx`. **Pattern réutilisable**
pour tout futur composant à état interne piloté par clic (dropdown, popover,
accordion) qui n'expose pas de prop d'ouverture contrôlée.

## Composants sans consommateur réel dans apps/platform (au 2026-08-03)

8 des 13 composants exportés par `packages/ui-react` n'ont **aucun import**
dans `apps/platform/src` au moment de cette sync : `ProfileCardReact`,
`ProfileHeroReact`, `ProfileHeroView`, `Textarea`, `UploadAvatar`,
`UploadPublicationImages`, `PublicationCardPreview`, `PublicationActionsMenu`.
Signalé à Killian (probable code en attente de branchement, pas un bug).
**Conséquence pour l'authoring** : aucun exemple d'usage réel à porter pour
ces 8 — previews composées directement depuis le composant source + son
`.d.ts` (tier 3 du skill design-sync, "curate before invent"). Si ces
composants sont branchés plus tard dans l'app avec des patterns d'usage
différents de ceux choisis ici, un re-sync des previews concernées vaut le
coup pour rester représentatif de l'usage réel.

## Re-sync risks

- `dist/` (types + CSS compilé) est **entièrement régénéré** par
  `cfg.buildCmd` — ne jamais committer, ne jamais éditer à la main. Si
  `packages/ui-react/src` change (nouveau composant, classes Tailwind
  différentes, nouveaux tokens), relancer `cfg.buildCmd` en entier avant tout
  re-sync — un `dist/` périmé produit des previews avec un CSS ou des types
  obsolètes sans erreur visible.
- Le mapping `componentSrcMap` (13 entrées) doit être mis à jour à la main
  si un composant est ajouté/renommé/supprimé dans `packages/ui-react/src`
  — la découverte automatique ne fonctionne pas dans ce repo (voir ci-dessus,
  pas de `index.d.ts` racine).
- `.design-sync/tailwind-build.mjs` duplique la logique d'import de
  `apps/platform/src/app/globals.css` (liste des `@import` de CSS bruts +
  `@source`). Si `globals.css` change cette liste (nouveau fichier CSS ajouté
  à `packages/ui-react/src`, nouveau `@source`), mettre à jour le script en
  miroir — sinon le CSS des previews diverge silencieusement de l'app réelle.
- Fallback fonts (voir ci-dessus) : si Roboto/Poppins ne sont jamais
  résolues dans les previews, c'est le comportement attendu de ce setup, pas
  un bug de la sync.
- `cfg.overrides` (`ProfileHeroView.cardMode`, `AvatarCropperModal.cardMode`
  + `viewport`, `ProfileHeroReact.viewport`) sont calibrés sur le rendu
  actuel de ces composants. Si leur markup change significativement
  (nouvelle image full-width, nouvelle modale plus grande/petite), revérifier
  visuellement `_screenshots/review/general__<Name>.png` — un viewport
  devenu trop petit recoupe silencieusement le contenu.
