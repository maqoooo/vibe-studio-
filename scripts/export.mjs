/* ============================================================
   Eksport slajdów do PNG w dokładnym formacie Instagrama.
   Użycie:
     npm run export             → export/*.png w 2160×2700 (2×)
     npm run export -- --scale=1  → 1080×1350
     npm run export -- --only=03  → tylko wybrany slajd
     npm run export -- --jpg      → dodatkowo JPG (mniejsze pliki)
   ============================================================ */

import { readdir, mkdir } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { execSync } from 'node:child_process';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SLIDES_DIR = path.join(ROOT, 'slides');
const OUT_DIR = path.join(ROOT, 'export');

const arg = (name, fallback) => {
  const hit = process.argv.find(a => a.startsWith(`--${name}=`));
  return hit ? hit.split('=')[1] : fallback;
};
const flag = name => process.argv.includes(`--${name}`);

const SCALE = Number(arg('scale', 2));
const ONLY = arg('only', null);
const WIDTH = 1080;
const HEIGHT = 1350;

async function loadPlaywright() {
  for (const mod of ['playwright', 'playwright-core']) {
    try { return await import(mod); } catch { /* szukamy dalej */ }
  }
  try {
    const globalRoot = execSync('npm root -g', { encoding: 'utf8' }).trim();
    return await import(pathToFileURL(path.join(globalRoot, 'playwright', 'index.mjs')).href);
  } catch { /* poniżej czytelny komunikat */ }
  throw new Error(
    'Nie znaleziono Playwrighta.\n' +
    'Zainstaluj zależności projektu:  npm install'
  );
}

async function main() {
  const { chromium } = await loadPlaywright();

  const files = (await readdir(SLIDES_DIR))
    .filter(f => f.endsWith('.html'))
    .filter(f => !ONLY || f.startsWith(ONLY))
    .sort();

  if (!files.length) {
    console.error('Brak plików do wyeksportowania w slides/');
    process.exit(1);
  }

  await mkdir(OUT_DIR, { recursive: true });

  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: WIDTH, height: HEIGHT },
    deviceScaleFactor: SCALE,
  });
  const page = await context.newPage();

  console.log(`\nEksport ${files.length} slajdów → ${WIDTH * SCALE}×${HEIGHT * SCALE} px\n`);

  for (const file of files) {
    const url = pathToFileURL(path.join(SLIDES_DIR, file)).href + '?raw=1';
    await page.goto(url, { waitUntil: 'networkidle' });

    // poczekaj na fonty (bez sieci lecimy dalej na krojach zastępczych)
    await page.evaluate(() =>
      Promise.race([document.fonts.ready, new Promise(r => setTimeout(r, 6000))])
    );
    await page.waitForTimeout(220);

    const slide = await page.$('.slide');
    if (!slide) { console.warn(`  ! ${file} — nie znaleziono .slide`); continue; }

    // ostrzeżenie, gdy treść nie mieści się w kadrze
    const overflow = await page.evaluate(() => {
      const c = document.querySelector('.slide__content');
      return c ? Math.max(0, c.scrollHeight - c.clientHeight) : 0;
    });

    const base = file.replace(/\.html$/, '');
    await slide.screenshot({ path: path.join(OUT_DIR, `${base}.png`) });
    if (flag('jpg')) {
      await slide.screenshot({ path: path.join(OUT_DIR, `${base}.jpg`), quality: 92, type: 'jpeg' });
    }

    console.log(`  ✓ ${base}.png${overflow ? `   ⚠ treść wychodzi poza kadr o ${overflow} px` : ''}`);
  }

  await browser.close();
  console.log(`\nGotowe. Pliki znajdziesz w: export/\n`);
}

main().catch(err => {
  console.error('\n' + err.message + '\n');
  process.exit(1);
});
