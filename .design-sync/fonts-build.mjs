// Télécharge les polices de marque (Roboto, Poppins) depuis Google Fonts
// (licence OFL, redistribution libre) pour les previews design-sync de
// packages/ui-react. L'app réelle (apps/platform) les charge via
// next/font/google (auto-hébergement au build Next.js) — aucun .woff2
// n'existe dans le repo à embarquer directement, voir NOTES.md.
//
// Sortie : packages/ui-react/dist/fonts/{*.woff2,fonts.css} (gitignored,
// régénérée par cfg.buildCmd). cfg.extraFonts pointe sur fonts.css.
//
// Piège : l'API css2 de Google Fonts sert un unique fichier woff2 variable
// partagé entre poids à un User-Agent moderne (les @font-face déclarent un
// font-weight fixe, pas une plage — un navigateur rend alors tous les poids
// identiques). Un User-Agent pré-variable-fonts force des fichiers statiques
// distincts par poids, ce que next/font fait aussi en interne.
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const OLD_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/60.0.3112.113 Safari/537.36';

const FAMILIES = {
  Roboto: ['300', '400', '500', '700'],
  Poppins: ['400', '500', '600', '700'],
};

const query = Object.entries(FAMILIES)
  .map(([name, weights]) => `family=${name}:wght@${weights.join(';')}`)
  .join('&');

const cssRes = await fetch(`https://fonts.googleapis.com/css2?${query}&display=swap`, {
  headers: { 'User-Agent': OLD_UA },
});
if (!cssRes.ok) throw new Error(`Google Fonts CSS fetch failed: ${cssRes.status}`);
const css = await cssRes.text();

// Un bloc = "/* subset */\n@font-face {...}\n" — ne garder que le subset latin.
const blocks = css.split(/\n(?=\/\*)/).filter((b) => /^\/\* latin \*\//.test(b.trim()));

const outDir = resolve(import.meta.dirname, '..', 'packages/ui-react/dist/fonts');
mkdirSync(outDir, { recursive: true });

let out = '';
for (const b of blocks) {
  const family = /font-family: '([^']+)'/.exec(b)?.[1];
  const weight = /font-weight: (\d+)/.exec(b)?.[1];
  const url = /url\((https:[^)]+)\)/.exec(b)?.[1];
  if (!family || !weight || !url) continue;
  const filename = `${family.toLowerCase()}-${weight}.woff2`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`font fetch failed ${url}: ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  writeFileSync(resolve(outDir, filename), buf);
  out += `@font-face {\n  font-family: '${family}';\n  font-style: normal;\n  font-weight: ${weight};\n  font-display: swap;\n  src: url('./${filename}') format('woff2');\n}\n`;
  console.error(`  [fonts-build] ${filename} (${(buf.length / 1024).toFixed(1)} KiB)`);
}
writeFileSync(resolve(outDir, 'fonts.css'), out);
console.error(`[fonts-build] wrote ${resolve(outDir, 'fonts.css')}`);
