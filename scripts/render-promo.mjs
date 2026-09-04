/* ============================================================
   Render animacji promo „Harmonogram wywozu śmieci” do MP4.
     npm run promo:render                → promo-harmonogram/export/harmonogram-promo.mp4
     npm run promo:render -- --frames    → tylko klatki PNG (bez ffmpeg)
     npm run promo:render -- --at=3.2    → pojedyncza klatka podglądu (PNG) z czasu 3.2 s
     npm run promo:render -- --at=1,4,8  → kilka klatek podglądu
     npm run promo:render -- --ffmpeg=/ścieżka/do/ffmpeg
     npm run promo:render -- --encode-only  → tylko ffmpeg z istniejących klatek

   Wymagania: Playwright (npm install) oraz ffmpeg z libx264 —
   szukany w: --ffmpeg=, $FFMPEG, PATH, pakiecie npm ffmpeg-static,
   pakiecie Pythona imageio-ffmpeg.
   ============================================================ */

import { mkdir, rm, readdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { execSync, spawnSync } from 'node:child_process';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PROMO = path.join(ROOT, 'promo-harmonogram');
const OUT_DIR = path.join(PROMO, 'export');
const FRAMES_DIR = path.join(OUT_DIR, 'frames');
const OUT_FILE = path.join(OUT_DIR, 'harmonogram-promo.mp4');

const WIDTH = 1080, HEIGHT = 1920;

const arg = (name, fallback) => {
  const hit = process.argv.find(a => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
};
const flag = name => process.argv.includes(`--${name}`);

async function loadPlaywright() {
  for (const mod of ['playwright', 'playwright-core']) {
    try { return await import(mod); } catch { /* dalej */ }
  }
  try {
    const globalRoot = execSync('npm root -g', { encoding: 'utf8' }).trim();
    return await import(pathToFileURL(path.join(globalRoot, 'playwright', 'index.mjs')).href);
  } catch { /* poniżej komunikat */ }
  throw new Error('Nie znaleziono Playwrighta. Zainstaluj zależności:  npm install');
}

function findFfmpeg() {
  const candidates = [arg('ffmpeg', null), process.env.FFMPEG].filter(Boolean);
  for (const c of candidates) if (existsSync(c)) return c;

  const onPath = spawnSync('ffmpeg', ['-version'], { encoding: 'utf8' });
  if (onPath.status === 0 && /libx264/.test(onPath.stdout + onPath.stderr)) return 'ffmpeg';

  for (const dir of [path.join(ROOT, 'node_modules', 'ffmpeg-static')]) {
    for (const bin of ['ffmpeg', 'ffmpeg.exe']) {
      const p = path.join(dir, bin);
      if (existsSync(p)) return p;
    }
  }
  const py = spawnSync('python3', ['-c', 'import imageio_ffmpeg;print(imageio_ffmpeg.get_ffmpeg_exe())'], { encoding: 'utf8' });
  if (py.status === 0 && py.stdout.trim()) return py.stdout.trim();

  return null;
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  if (flag('encode-only')) {
    if (!existsSync(path.join(FRAMES_DIR, 'f0000.png'))) throw new Error(`Brak klatek w ${path.relative(ROOT, FRAMES_DIR)}/ — najpierw pełny render.`);
    const n = (await readdir(FRAMES_DIR)).filter(f => /^f\d{4}\.png$/.test(f)).length;
    return encode(30, n);
  }
  const { chromium } = await loadPlaywright();

  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: WIDTH, height: HEIGHT },
    deviceScaleFactor: 1,
    reducedMotion: 'no-preference',
  });
  const page = await context.newPage();
  page.on('pageerror', e => console.error('  ! błąd strony:', e.message));

  await page.goto(pathToFileURL(path.join(PROMO, 'index.html')).href + '?raw=1', { waitUntil: 'networkidle' });
  await page.evaluate(() => window.__ready);
  await page.waitForTimeout(150);

  const fps = await page.evaluate(() => window.__fps);
  const total = await page.evaluate(() => window.__frames());
  const duration = await page.evaluate(() => window.__duration);

  const shot = async (sec, file) => {
    await page.evaluate(s => window.__seek(s), sec);
    await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
    await page.screenshot({ path: file, type: 'png', clip: { x: 0, y: 0, width: WIDTH, height: HEIGHT } });
  };

  // tryb podglądu: wybrane sekundy → PNG
  const at = arg('at', null);
  if (at) {
    const previewDir = path.join(OUT_DIR, 'preview');
    await mkdir(previewDir, { recursive: true });
    for (const s of at.split(',').map(Number)) {
      const file = path.join(previewDir, `t-${s.toFixed(2).replace('.', '_')}.png`);
      await shot(s, file);
      console.log(`  ✓ ${path.relative(ROOT, file)}`);
    }
    await browser.close();
    return;
  }

  // pełny render klatek
  await rm(FRAMES_DIR, { recursive: true, force: true });
  await mkdir(FRAMES_DIR, { recursive: true });
  console.log(`\nRender ${total} klatek (${duration} s @ ${fps} kl./s, ${WIDTH}×${HEIGHT})\n`);
  const t0 = Date.now();
  for (let i = 0; i < total; i++) {
    await shot(i / fps, path.join(FRAMES_DIR, `f${String(i).padStart(4, '0')}.png`));
    if (i % 30 === 0 || i === total - 1) {
      const el = ((Date.now() - t0) / 1000).toFixed(0);
      process.stdout.write(`\r  klatka ${String(i + 1).padStart(3)}/${total}   ${el}s`);
    }
  }
  console.log('\n');
  await browser.close();

  if (flag('frames')) {
    console.log(`Klatki zapisane w ${path.relative(ROOT, FRAMES_DIR)}/ (pominięto ffmpeg)\n`);
    return;
  }
  await encode(fps, total);
}

async function encode(fps, total) {
  const ffmpeg = findFfmpeg();
  if (!ffmpeg) {
    throw new Error(
      'Nie znaleziono ffmpeg z libx264. Podaj ścieżkę: --ffmpeg=/sciezka/ffmpeg\n' +
      'albo zainstaluj:  npm i -D ffmpeg-static   /   pip install imageio-ffmpeg\n' +
      `Klatki zostały w ${path.relative(ROOT, FRAMES_DIR)}/`
    );
  }

  // H.264, yuv420p, 30 kl./s, faststart — profil zgodny z IG Reels / TikTok / Shorts
  const args = [
    '-y', '-hide_banner', '-loglevel', 'error', '-stats',
    '-framerate', String(fps), '-i', path.join(FRAMES_DIR, 'f%04d.png'),
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '17',
    '-profile:v', 'high', '-level', '4.1',
    '-pix_fmt', 'yuv420p', '-r', String(fps),
    '-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709',
    '-movflags', '+faststart',
    OUT_FILE,
  ];
  console.log(`Kodowanie MP4 (${path.basename(ffmpeg)})…`);
  const res = spawnSync(ffmpeg, args, { stdio: 'inherit' });
  if (res.status !== 0) throw new Error('ffmpeg zakończył się błędem');

  // klatka-plakat (okładka do publikacji) z końcowego ujęcia
  const posterSrc = path.join(FRAMES_DIR, `f${String(total - 1).padStart(4, '0')}.png`);
  spawnSync(ffmpeg, ['-y', '-hide_banner', '-loglevel', 'error', '-i', posterSrc, path.join(OUT_DIR, 'harmonogram-promo-poster.jpg')]);

  if (!flag('keep-frames')) await rm(FRAMES_DIR, { recursive: true, force: true });

  const files = (await readdir(OUT_DIR)).filter(f => f.startsWith('harmonogram-promo'));
  console.log(`\nGotowe → ${path.relative(ROOT, OUT_DIR)}/${files.join(', ')}\n`);
}

main().catch(err => {
  console.error('\n' + err.message + '\n');
  process.exit(1);
});
