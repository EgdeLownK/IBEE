// Compile un CSS Tailwind v4 réel (classes utilitaires + tokens.css @theme)
// pour les previews design-sync de packages/ui-react. Ce package ne livre
// aucun CSS compilé — les classes utilitaires (bg-surface, rounded-card, ...)
// n'existent qu'après compilation Tailwind, normalement faite par le build
// Next.js de apps/platform (voir apps/platform/src/app/globals.css). Ce
// script rejoue la même compilation, scindée sur packages/ui-react/src
// uniquement, pour que les previews claude.ai/design rendent avec les vrais
// tokens IBEE. Sortie : .design-sync/generated/tailwind-compiled.css
// (gitignored, régénérée par cfg.buildCmd à chaque re-sync).
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const PLATFORM = resolve(ROOT, 'apps/platform');
const require = createRequire(resolve(PLATFORM, 'package.json'));

// postcss est une dépendance transitive de @tailwindcss/postcss (pas un
// devDependency direct de apps/platform) — pnpm isole node_modules, donc on
// la résout depuis le scope du plugin lui-même, pas depuis apps/platform.
const tailwindPostcssEntry = require.resolve('@tailwindcss/postcss');
const requireFromPlugin = createRequire(tailwindPostcssEntry);
const postcss = requireFromPlugin('postcss');
const tailwindPostcss = require('@tailwindcss/postcss');

// L'entrée doit vivre sous apps/platform/ pour que la résolution Node de
// '@import "tailwindcss"' trouve apps/platform/node_modules/tailwindcss
// (symlink pnpm) — la racine du repo n'a pas ce symlink au niveau attendu.
const entryPath = resolve(PLATFORM, '.design-sync-tailwind-entry.css');
// cfg.cssEntry doit rester DANS PKG_DIR (packages/ui-react) — le
// convertisseur rejette tout chemin hors du package (garde-fou anti-
// exfiltration, voir package-build.mjs autour de "cssEntry stays bounded to
// PKG_DIR"). dist/ est déjà gitignored (accueille aussi les .d.ts tsc).
const outPath = resolve(ROOT, 'packages/ui-react/dist/tailwind-compiled.css');

const uiReactSrc = resolve(ROOT, 'packages/ui-react/src').split('\\').join('/');
const entry = `
@import 'tailwindcss';
@import '${uiReactSrc}/tokens.css';
@import '${uiReactSrc}/button.css';
@import '${uiReactSrc}/app-shell.css';
@import '${uiReactSrc}/navpill.css' layer(components);
@import '${uiReactSrc}/profile/profile-styles.css';
@import '${uiReactSrc}/profile/home-widgets.css';
@import '${uiReactSrc}/profile/history-edit-styles.css';
@import '${uiReactSrc}/profile/product-create-styles.css';
@import '${uiReactSrc}/profile/profile-general-styles.css';
@import '${uiReactSrc}/dashboard/analyse-styles.css';
@import '${uiReactSrc}/dashboard/revenu-styles.css';
@import '${uiReactSrc}/dashboard/team-styles.css';
@import '${uiReactSrc}/dashboard/talent-styles.css';
@import '${uiReactSrc}/dashboard/activite-styles.css';
@import '${uiReactSrc}/dashboard/messages-styles.css';
@import '${uiReactSrc}/home-feed.css';
@import '${uiReactSrc}/components/media-gallery-carousel.css';

@source '${uiReactSrc}/**/*.{ts,tsx}';
@source '${uiReactSrc}/dashboard/**/*.css';
`;

mkdirSync(dirname(entryPath), { recursive: true });
writeFileSync(entryPath, entry);

const result = await postcss([tailwindPostcss({ base: dirname(entryPath) })]).process(entry, {
  from: entryPath,
  to: outPath,
});

writeFileSync(outPath, result.css);
console.error(`[tailwind-build] wrote ${outPath} (${(result.css.length / 1024).toFixed(1)} KiB)`);
