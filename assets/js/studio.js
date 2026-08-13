/* ============================================================
   VIBE STUDIO — logika edytora karuzeli
   Podgląd slajdów, podmiana zdjęć, edycja tekstów, eksport PNG.
   ============================================================ */

const SLIDES = [
  { id: '01', file: '01-okladka.html',       name: 'Okładka' },
  { id: '02', file: '02-small-groups.html',  name: 'Small groups' },
  { id: '03', file: '03-morning-vibe.html',  name: 'Morning Vibe' },
  { id: '04', file: '04-sunset-vibe.html',   name: 'Sunset Vibe' },
  { id: '05', file: '05-bilety.html',        name: 'Bilety' },
  { id: '06', file: '06-zapisy.html',        name: 'Zapisy / CTA' },
  { id: '07', file: '07-okladka-alt.html',   name: 'Okładka ALT (zapas)' },
];

const FONT_CSS = 'assets/css/fonts.css';
const STORE_KEY = 'vibe-studio-v1';
const PREVIEW_W = 360;

let state = load();
let editMode = false;
const frames = {};

/* ---------------- stan ---------------- */
function load() {
  try { return JSON.parse(localStorage.getItem(STORE_KEY)) || {}; }
  catch { return {}; }
}
function save() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); }
  catch (e) { toast('Za dużo danych w pamięci przeglądarki — użyj assets/img/'); }
}
function st(id) {
  if (!state[id]) state[id] = { photo: null, zoom: 1, x: 50, y: 50, veil: null, texts: {} };
  return state[id];
}

/* ---------------- pomocnicze ---------------- */
const $ = (sel, root = document) => root.querySelector(sel);

function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('on');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => t.classList.remove('on'), 2600);
}

function blobToDataURL(blob) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result);
    r.onerror = rej;
    r.readAsDataURL(blob);
  });
}

const PL = { ą: 'a', ć: 'c', ę: 'e', ł: 'l', ń: 'n', ó: 'o', ś: 's', ź: 'z', ż: 'z' };
const slug = s => s.toLowerCase().replace(/[ąćęłńóśźż]/g, c => PL[c])
  .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

function fileName(s) { return `vibe-${s.id}-${slug(s.name)}.png`; }

function download(blob, name) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
}

/* ---------------- budowa interfejsu ---------------- */
function build() {
  const grid = $('#grid');
  const scale = PREVIEW_W / 1080;

  SLIDES.forEach((s, i) => {
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
      <div class="card__head">
        <span class="card__num">${s.id}</span>
        <span class="card__name">${s.name}</span>
        <span class="card__warn" id="warn-${s.id}">tekst nie mieści się</span>
      </div>
      <div class="viewport" id="vp-${s.id}" style="height:${Math.round(1350 * scale)}px">
        <iframe id="fr-${s.id}" src="slides/${s.file}?raw=1"
                style="transform:scale(${scale})" loading="eager"></iframe>
        <div class="viewport__hint">upuść zdjęcie, aby ustawić tło</div>
      </div>
      <div class="tools">
        <div class="tools__row">
          <button class="btn btn--sm" data-act="photo" data-id="${s.id}">Zdjęcie…</button>
          <button class="btn btn--sm" data-act="clear" data-id="${s.id}">Wyczyść</button>
          <button class="btn btn--sm" data-act="open"  data-id="${s.id}">Otwórz</button>
          <button class="btn btn--sm btn--primary" data-act="png" data-id="${s.id}">PNG</button>
        </div>
        <details>
          <summary>Kadr i przyciemnienie</summary>
          <div>
            <div class="slider">
              <label>Zoom</label>
              <input type="range" min="100" max="260" value="100" data-slider="zoom" data-id="${s.id}">
              <output>100%</output>
            </div>
            <div class="slider">
              <label>Poziomo</label>
              <input type="range" min="0" max="100" value="50" data-slider="x" data-id="${s.id}">
              <output>50%</output>
            </div>
            <div class="slider">
              <label>Pionowo</label>
              <input type="range" min="0" max="100" value="50" data-slider="y" data-id="${s.id}">
              <output>50%</output>
            </div>
            <div class="slider">
              <label>Przyciemn.</label>
              <input type="range" min="0" max="90" value="0" data-slider="veil" data-id="${s.id}">
              <output>auto</output>
            </div>
            <div class="tools__row">
              <button class="btn btn--sm" data-act="copy" data-id="${s.id}">Kopiuj HTML slajdu</button>
            </div>
          </div>
        </details>
      </div>`;
    grid.appendChild(card);

    const frame = $('#fr-' + s.id);
    frames[s.id] = frame;
    frame.addEventListener('load', () => onFrameLoad(s.id));

    wireDrop($('#vp-' + s.id), s.id);
  });

  grid.addEventListener('click', onGridClick);
  grid.addEventListener('input', onSlider);
}

/* ---------------- po załadowaniu ramki ---------------- */
function onFrameLoad(id) {
  const doc = frames[id].contentDocument;
  if (!doc) return;
  const slide = doc.querySelector('.slide');
  if (!slide) return;

  applyPhoto(id);
  applyTexts(id);
  applyEditMode(id);

  const nodes = doc.querySelectorAll('[data-edit]');
  nodes.forEach((n, i) => {
    n.dataset.editIndex = i;
    n.addEventListener('input', () => {
      st(id).texts[i] = n.innerHTML;
      clearTimeout(onFrameLoad._t);
      onFrameLoad._t = setTimeout(() => { save(); checkOverflow(id); }, 400);
    });
  });

  if (doc.fonts) doc.fonts.ready.then(() => setTimeout(() => checkOverflow(id), 80));
  else setTimeout(() => checkOverflow(id), 400);

  // odśwież suwaki wartościami ze stanu
  const s = st(id);
  setSlider(id, 'zoom', Math.round(s.zoom * 100));
  setSlider(id, 'x', s.x);
  setSlider(id, 'y', s.y);
  setSlider(id, 'veil', s.veil == null ? 0 : Math.round(s.veil * 100));
}

function setSlider(id, key, val) {
  const inp = document.querySelector(`[data-slider="${key}"][data-id="${id}"]`);
  if (!inp) return;
  inp.value = val;
  inp.nextElementSibling.textContent =
    key === 'veil' ? (val === 0 ? 'auto' : val + '%') :
    key === 'zoom' ? val + '%' : val + '%';
}

function checkOverflow(id) {
  const doc = frames[id].contentDocument;
  const c = doc && doc.querySelector('.slide__content');
  if (!c) return;
  const over = c.scrollHeight - c.clientHeight > 1;
  $('#warn-' + id).classList.toggle('on', over);
}

/* ---------------- zdjęcia ---------------- */
function applyPhoto(id) {
  const doc = frames[id].contentDocument;
  const slide = doc && doc.querySelector('.slide');
  if (!slide) return;
  const photoEl = doc.querySelector('.slide__photo');
  const s = st(id);
  if (s.photo && photoEl) photoEl.style.backgroundImage = `url("${s.photo}")`;
  slide.style.setProperty('--photo-zoom', s.zoom);
  slide.style.setProperty('--photo-x', s.x + '%');
  slide.style.setProperty('--photo-y', s.y + '%');
  if (s.veil != null) slide.style.setProperty('--veil', s.veil);
}

function wireDrop(vp, id) {
  ['dragenter', 'dragover'].forEach(ev =>
    vp.addEventListener(ev, e => { e.preventDefault(); vp.classList.add('drop'); }));
  ['dragleave', 'drop'].forEach(ev =>
    vp.addEventListener(ev, e => { e.preventDefault(); vp.classList.remove('drop'); }));
  vp.addEventListener('drop', async e => {
    const f = e.dataTransfer.files[0];
    if (f && f.type.startsWith('image/')) await usePhoto(id, f);
  });
}

async function usePhoto(id, file) {
  st(id).photo = await blobToDataURL(file);
  save();
  applyPhoto(id);
  toast('Tło ustawione — slajd ' + id);
}

/* ---------------- teksty ---------------- */
function applyTexts(id) {
  const doc = frames[id].contentDocument;
  const nodes = doc.querySelectorAll('[data-edit]');
  const texts = st(id).texts || {};
  nodes.forEach((n, i) => { if (texts[i] != null) n.innerHTML = texts[i]; });
}

function applyEditMode(id) {
  const doc = frames[id].contentDocument;
  if (!doc || !doc.body) return;
  doc.body.classList.toggle('edit-on', editMode);
  doc.querySelectorAll('[data-edit]').forEach(n => { n.contentEditable = editMode ? 'true' : 'false'; });
}

/* ---------------- akcje ---------------- */
function onGridClick(e) {
  const btn = e.target.closest('[data-act]');
  if (!btn) return;
  const id = btn.dataset.id;

  switch (btn.dataset.act) {
    case 'photo': {
      const inp = $('#file');
      inp.onchange = async () => {
        if (inp.files[0]) await usePhoto(id, inp.files[0]);
        inp.value = '';
      };
      inp.click();
      break;
    }
    case 'clear':
      state[id] = { photo: null, zoom: 1, x: 50, y: 50, veil: null, texts: {} };
      save();
      frames[id].contentWindow.location.reload();
      toast('Slajd ' + id + ' przywrócony');
      break;
    case 'open':
      window.open('slides/' + SLIDES.find(s => s.id === id).file, '_blank');
      break;
    case 'png':
      exportPNG(id, btn);
      break;
    case 'copy':
      copyHTML(id);
      break;
  }
}

function onSlider(e) {
  const inp = e.target.closest('[data-slider]');
  if (!inp) return;
  const id = inp.dataset.id;
  const val = Number(inp.value);
  const s = st(id);

  if (inp.dataset.slider === 'zoom') { s.zoom = val / 100; inp.nextElementSibling.textContent = val + '%'; }
  if (inp.dataset.slider === 'x') { s.x = val; inp.nextElementSibling.textContent = val + '%'; }
  if (inp.dataset.slider === 'y') { s.y = val; inp.nextElementSibling.textContent = val + '%'; }
  if (inp.dataset.slider === 'veil') {
    s.veil = val === 0 ? null : val / 100;
    inp.nextElementSibling.textContent = val === 0 ? 'auto' : val + '%';
    if (s.veil == null) { frames[id].contentWindow.location.reload(); return; }
  }
  applyPhoto(id);
  clearTimeout(onSlider._t);
  onSlider._t = setTimeout(save, 300);
}

async function copyHTML(id) {
  const doc = frames[id].contentDocument;
  const slide = doc.querySelector('.slide');
  const clone = slide.cloneNode(true);
  clone.querySelectorAll('[contenteditable]').forEach(n => {
    n.removeAttribute('contenteditable');
    n.removeAttribute('data-edit-index');
  });
  try {
    await navigator.clipboard.writeText(clone.outerHTML);
    toast('HTML slajdu ' + id + ' skopiowany');
  } catch {
    toast('Nie udało się skopiować — użyj przycisku Otwórz');
  }
}

/* ---------------- eksport PNG ---------------- */
let fontCssCache = null;

/* kroje muszą trafić do pliku PNG jako dane — inaczej SVG ich nie zobaczy */
async function inlineFonts() {
  if (fontCssCache) return fontCssCache;
  const cssUrl = new URL(FONT_CSS, location.href).href;
  let css = await (await fetch(cssUrl)).text();

  const urls = [...new Set(
    [...css.matchAll(/url\(([^)]+)\)/g)].map(m => m[1].replace(/["']/g, '').trim())
  )];
  for (const u of urls) {
    const b = await (await fetch(new URL(u, cssUrl).href)).blob();
    css = css.split(u).join(await blobToDataURL(b));
  }
  fontCssCache = css;
  return css;
}

async function collectCss(doc) {
  let css = '';
  for (const sheet of doc.styleSheets) {
    if (sheet.href && sheet.href.includes('fonts.css')) continue; // osadzane osobno
    try {
      for (const rule of sheet.cssRules) css += rule.cssText + '\n';
    } catch {
      /* arkusz z innej domeny — pomijamy */
    }
  }
  return css;
}

async function inlinePhoto(doc, clone) {
  const src = doc.querySelector('.slide__photo');
  const target = clone.querySelector('.slide__photo');
  if (!src || !target) return;

  const m = src.style.backgroundImage.match(/url\(["']?([^"')]+)["']?\)/);
  if (!m) return;
  if (m[1].startsWith('data:')) return; // już osadzone

  try {
    const abs = new URL(m[1], doc.baseURI).href;
    const b = await (await fetch(abs)).blob();
    target.style.backgroundImage = `url("${await blobToDataURL(b)}")`;
  } catch {
    target.style.backgroundImage = 'none'; // brak pliku → zostaje tło rysowane CSS-em
  }
}

async function renderPNG(id, scale = 1) {
  const doc = frames[id].contentDocument;
  const slide = doc.querySelector('.slide');

  const [fonts, css] = await Promise.all([inlineFonts().catch(() => ''), collectCss(doc)]);

  const clone = slide.cloneNode(true);
  clone.querySelectorAll('[contenteditable]').forEach(n => n.removeAttribute('contenteditable'));
  await inlinePhoto(doc, clone);

  const html = new XMLSerializer().serializeToString(clone);
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1350" viewBox="0 0 1080 1350">` +
    `<foreignObject x="0" y="0" width="1080" height="1350">` +
    `<div xmlns="http://www.w3.org/1999/xhtml">` +
    `<style>${fonts}${css}</style>${html}</div>` +
    `</foreignObject></svg>`;

  const img = new Image();
  img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  await img.decode();

  const c = document.createElement('canvas');
  c.width = 1080 * scale;
  c.height = 1350 * scale;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.drawImage(img, 0, 0, c.width, c.height);

  return new Promise(res => c.toBlob(res, 'image/png'));
}

async function exportPNG(id, btn) {
  const label = btn ? btn.textContent : '';
  if (btn) { btn.textContent = '…'; btn.disabled = true; }
  try {
    const blob = await renderPNG(id, Number($('#scale').value));
    const s = SLIDES.find(x => x.id === id);
    download(blob, fileName(s));
    toast('Pobrano slajd ' + id);
  } catch (e) {
    console.error(e);
    toast('Eksport w przeglądarce nie zadziałał — użyj: npm run export');
  } finally {
    if (btn) { btn.textContent = label; btn.disabled = false; }
  }
}

async function exportAll(btn) {
  btn.disabled = true;
  const old = btn.textContent;
  for (const s of SLIDES) {
    btn.textContent = `Eksport ${s.id}/${SLIDES.length}…`;
    try {
      const blob = await renderPNG(s.id, Number($('#scale').value));
      download(blob, fileName(s));
      await new Promise(r => setTimeout(r, 500));
    } catch (e) { console.error('slajd ' + s.id, e); }
  }
  btn.textContent = old;
  btn.disabled = false;
  toast('Gotowe');
}

/* ---------------- start ---------------- */
function init() {
  if (location.protocol === 'file:') $('#notice').classList.remove('notice--hidden');

  build();

  $('#edit').addEventListener('click', e => {
    editMode = !editMode;
    e.target.classList.toggle('btn--on', editMode);
    e.target.textContent = editMode ? 'Edycja tekstu: WŁ.' : 'Edycja tekstu';
    SLIDES.forEach(s => applyEditMode(s.id));
    if (editMode) toast('Klikaj w teksty na podglądzie i pisz');
  });

  $('#all').addEventListener('click', e => exportAll(e.target));

  $('#reset').addEventListener('click', () => {
    if (!confirm('Usunąć wszystkie zmiany (teksty i zdjęcia) i wrócić do wersji z plików?')) return;
    state = {};
    localStorage.removeItem(STORE_KEY);
    SLIDES.forEach(s => frames[s.id].contentWindow.location.reload());
    toast('Przywrócono wersję wyjściową');
  });

  $('#save-json').addEventListener('click', () => {
    download(new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' }), 'vibe-zmiany.json');
  });
}

document.addEventListener('DOMContentLoaded', init);
