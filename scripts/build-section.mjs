/* ============================================================
   Składa sekcję „Jak to działa” do JEDNEGO pliku HTML bez zależności:
   fonty Poppins, okładka i film są osadzone jako data URI.

     npm run promo:section
       → promo-harmonogram/export/sekcja-jak-to-dziala-standalone.html

   Opcje:
     --video=export/inny.mp4   inny plik wideo do osadzenia
     --no-recompress           osadź MP4 z export/ bez ponownego kodowania
                               (domyślnie robimy lżejszą wersję web, CRF 22)
   ffmpeg (libx264) szukany jak w render-promo.mjs; bez niego działa
   tylko wariant --no-recompress.
   ============================================================ */

import { readFile, writeFile, mkdir, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PROMO = path.join(ROOT, 'promo-harmonogram');
const SRC = path.join(PROMO, 'sekcja-jak-to-dziala.html');
const OUT = path.join(PROMO, 'export', 'sekcja-jak-to-dziala-standalone.html');
const TMP_MP4 = path.join(PROMO, 'export', '.web-tmp.mp4');

const arg = (name, fallback) => {
  const hit = process.argv.find(a => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
};
const flag = name => process.argv.includes(`--${name}`);

const MIME = {
  '.woff2': 'font/woff2', '.woff': 'font/woff', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.png': 'image/png', '.mp4': 'video/mp4', '.webm': 'video/webm',
};
const dataUri = async file => {
  const buf = await readFile(file);
  return `data:${MIME[path.extname(file).toLowerCase()] || 'application/octet-stream'};base64,${buf.toString('base64')}`;
};
const kb = n => `${Math.round(n / 1024)} kB`;

function findFfmpeg() {
  const c = [arg('ffmpeg', null), process.env.FFMPEG].filter(Boolean).find(existsSync);
  if (c) return c;
  const onPath = spawnSync('ffmpeg', ['-version'], { encoding: 'utf8' });
  if (onPath.status === 0 && /libx264/.test(onPath.stdout + onPath.stderr)) return 'ffmpeg';
  for (const bin of ['ffmpeg', 'ffmpeg.exe']) {
    const p = path.join(ROOT, 'node_modules', 'ffmpeg-static', bin);
    if (existsSync(p)) return p;
  }
  const py = spawnSync('python3', ['-c', 'import imageio_ffmpeg;print(imageio_ffmpeg.get_ffmpeg_exe())'], { encoding: 'utf8' });
  return py.status === 0 && py.stdout.trim() ? py.stdout.trim() : null;
}

async function main() {
  let html = await readFile(SRC, 'utf8');

  // 1. fonty → inline @font-face z data URI
  const fontsCss = await readFile(path.join(PROMO, 'assets', 'fonts.css'), 'utf8');
  let inlinedFonts = fontsCss;
  for (const m of fontsCss.matchAll(/url\((fonts\/[^)]+)\)/g)) {
    inlinedFonts = inlinedFonts.replace(m[0], `url(${await dataUri(path.join(PROMO, 'assets', m[1]))})`);
  }
  html = html.replace(
    /<!-- Poppins lokalnie[\s\S]*?<link rel="stylesheet" href="assets\/fonts.css">/,
    `<!-- Poppins osadzony w pliku (plik wygenerowany przez scripts/build-section.mjs) -->\n<style>\n${inlinedFonts.trim()}\n</style>`
  );

  // 2. okładka
  html = html.replace('poster="export/harmonogram-promo-poster.jpg"',
    `poster="${await dataUri(path.join(PROMO, 'export', 'harmonogram-promo-poster.jpg'))}"`);

  // 3. film — domyślnie lżejsza wersja web (ten sam obraz, CRF 22)
  let video = path.join(PROMO, arg('video', 'export/harmonogram-promo.mp4'));
  if (!flag('no-recompress') && path.extname(video) === '.mp4') {
    const ffmpeg = findFfmpeg();
    if (ffmpeg) {
      const r = spawnSync(ffmpeg, ['-y', '-hide_banner', '-loglevel', 'error', '-i', video,
        '-c:v', 'libx264', '-preset', 'slow', '-crf', '22', '-profile:v', 'high', '-level', '4.1',
        '-pix_fmt', 'yuv420p', '-an', '-movflags', '+faststart', TMP_MP4], { stdio: 'inherit' });
      if (r.status === 0) video = TMP_MP4;
      else console.warn('  ! ffmpeg nie zadziałał — osadzam oryginalny MP4');
    } else {
      console.warn('  ! brak ffmpeg — osadzam oryginalny MP4 (większy plik)');
    }
  }
  const videoSize = (await stat(video)).size;
  html = html.replace(
    /<source src="export\/harmonogram-promo\.mp4" type="video\/mp4">\s*<source src="export\/harmonogram-promo\.webm" type="video\/webm">/,
    `<source src="${await dataUri(video)}" type="${MIME[path.extname(video)]}">`
  );
  if (video === TMP_MP4) spawnSync('rm', ['-f', TMP_MP4]);

  await mkdir(path.dirname(OUT), { recursive: true });
  await writeFile(OUT, html);
  const outSize = (await stat(OUT)).size;
  console.log(`\n  film ${kb(videoSize)} → plik ${kb(outSize)}`);
  console.log(`  ✓ ${path.relative(ROOT, OUT)}\n`);
}

main().catch(e => { console.error('\n' + e.message + '\n'); process.exit(1); });
