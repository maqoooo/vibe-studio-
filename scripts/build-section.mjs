/* ============================================================
   Składa sekcję „Jak to działa” do JEDNEGO pliku HTML bez zależności.

     npm run promo:section
       → promo-harmonogram/export/sekcja-jak-to-dziala-standalone.html

   Źródła:
     promo-harmonogram/sekcja-jak-to-dziala.template.html  — układ sekcji
     promo-harmonogram/index.html                          — ekrany aplikacji
                                                             (ten sam kod co w filmie)
     assets/screens.css, assets/phone-embed.css            — style
     assets/timeline-embed.js                              — oś czasu (pętla)
     assets/fonts.css + fonts/*.woff2                      — Poppins → data URI
   ============================================================ */

import { readFile, writeFile, mkdir, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PROMO = path.join(ROOT, 'promo-harmonogram');
const A = f => path.join(PROMO, 'assets', f);
const OUT = path.join(PROMO, 'export', 'sekcja-jak-to-dziala-standalone.html');

const read = f => readFile(f, 'utf8');
const pick = (html, re, what) => {
  const m = html.match(re);
  if (!m) throw new Error(`Nie znaleziono w index.html: ${what}`);
  return m[0];
};

async function main() {
  const template = await read(path.join(PROMO, 'sekcja-jak-to-dziala.template.html'));
  const index = await read(path.join(PROMO, 'index.html'));

  // 1. fonty → @font-face z data URI
  let fonts = await read(A('fonts.css'));
  for (const m of fonts.matchAll(/url\((fonts\/[^)]+)\)/g)) {
    const buf = await readFile(A(m[1]));
    fonts = fonts.replace(m[0], `url(data:font/woff2;base64,${buf.toString('base64')})`);
  }

  // 2. ekrany aplikacji i definicje ikon z index.html (jedno źródło prawdy)
  const icons = pick(index, /<svg width="0" height="0"[\s\S]*?<\/svg>/, 'blok <defs> z ikonami');
  let screens = pick(index, /<div class="phone__screen" id="screenWrap">[\s\S]*?<\/div><!-- \/phone__screen -->/, 'blok .phone__screen');
  screens = screens.replace('</div><!-- /phone__screen -->', '  <div class="loop-fade" id="loopFade"></div>\n        </div><!-- /phone__screen -->');

  // 3. style i skrypt — selektory ekranów dostają prefiks .phone-embed,
  //    żeby nie kolidowały z CSS strony, na którą trafi sekcja
  const scoped = (await read(A('screens.css')))
    .replace(/(^|\})([^{}]*?)\{/g, (m, end, sel) => {
      const body = sel.replace(/\/\*[\s\S]*?\*\//g, '').trim();
      if (!body) return m;
      const prefixed = body.split(',').map(x => `.phone-embed ${x.trim()}`).join(', ');
      return `${end}${sel.slice(0, sel.length - sel.trimStart().length)}${prefixed} {`;
    });
  const css = [scoped, await read(A('phone-embed.css'))].join('\n\n');
  const js = await read(A('timeline-embed.js'));

  const html = template
    .replace('<!-- @fonts -->', `<style>\n${fonts.trim()}\n</style>`)
    .replace('  <!-- @css -->', css.replace(/^/gm, '  ').trimEnd())
    .replace('<!-- @icons -->', icons)
    .replace('          <!-- @screens -->', screens.replace(/^/gm, '          ').trimStart().replace(/^/, '          '))
    .replace('<!-- @js -->', js.trim());

  if (/<!-- @\w+ -->/.test(html)) throw new Error('Nie wszystkie znaczniki szablonu zostały podmienione');

  await mkdir(path.dirname(OUT), { recursive: true });
  await writeFile(OUT, html);
  console.log(`\n  ✓ ${path.relative(ROOT, OUT)}  (${Math.round((await stat(OUT)).size / 1024)} kB)\n`);
}

main().catch(e => { console.error('\n' + e.message + '\n'); process.exit(1); });
