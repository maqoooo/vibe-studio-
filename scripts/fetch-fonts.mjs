/* ============================================================
   Pobiera kroje z Google Fonts do repozytorium (assets/fonts/)
   i generuje assets/css/fonts.css.

   Dzięki temu projekt renderuje się identycznie zawsze —
   także bez internetu i bez migotania tekstu przy otwarciu.

   Uruchom ponownie tylko wtedy, gdy zmieniasz kroje pisma:
     node scripts/fetch-fonts.mjs
   ============================================================ */

import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FONT_DIR = path.join(ROOT, 'assets', 'fonts');
const CSS_OUT = path.join(ROOT, 'assets', 'css', 'fonts.css');

// kroje używane w projekcie (zapis Google Fonts API v2)
const FAMILIES = [
  'Cormorant+Garamond:ital,wght@0,300..600;1,300..600',
  'Jost:wght@200..600',
  'Parisienne',
];

// polskie znaki mieszczą się w latin + latin-ext — resztę pomijamy
const SUBSETS = ['latin', 'latin-ext'];

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
           '(KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36';

async function main() {
  await mkdir(FONT_DIR, { recursive: true });
  let out = [
    '/* ============================================================',
    '   Kroje pisma — pliki lokalne w assets/fonts/',
    '   Plik generowany przez: node scripts/fetch-fonts.mjs',
    '   Nie edytuj ręcznie.',
    '   ============================================================ */',
    '',
  ].join('\n');

  for (const family of FAMILIES) {
    const url = `https://fonts.googleapis.com/css2?family=${family}&display=swap`;
    const css = await (await fetch(url, { headers: { 'User-Agent': UA } })).text();

    // CSS z Google jest podzielony komentarzem z nazwą podzbioru
    const blocks = css.split(/(?=\/\*)/).filter(b => b.includes('@font-face'));

    for (const block of blocks) {
      const subset = (block.match(/\/\*\s*([a-z-]+)\s*\*\//) || [])[1];
      if (!SUBSETS.includes(subset)) continue;

      const src = (block.match(/url\((https:\/\/[^)]+)\)/) || [])[1];
      if (!src) continue;

      const fam = (block.match(/font-family:\s*'([^']+)'/) || [])[1] || 'font';
      const style = (block.match(/font-style:\s*([a-z]+)/) || [])[1] || 'normal';
      const name = `${fam.toLowerCase().replace(/\s+/g, '-')}-${style}-${subset}.woff2`;

      const buf = Buffer.from(await (await fetch(src, { headers: { 'User-Agent': UA } })).arrayBuffer());
      await writeFile(path.join(FONT_DIR, name), buf);
      console.log(`  ✓ ${name}  (${Math.round(buf.length / 1024)} kB)`);

      out += block
        .replace(/\/\*[^*]*\*\/\s*/, `/* ${fam} — ${style} — ${subset} */\n`)
        .replace(/url\(https:\/\/[^)]+\)/, `url(../fonts/${name})`)
        .trimEnd() + '\n\n';
    }
  }

  await writeFile(CSS_OUT, out);
  console.log(`\nZapisano ${path.relative(ROOT, CSS_OUT)}\n`);
}

main().catch(e => { console.error(e.message); process.exit(1); });
