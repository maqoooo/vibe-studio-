/* ============================================================
   Oś czasu animacji promo (15 s, 30 kl./s).

   Każdy ruch to jedna animacja Web Animations API o długości 15 s,
   zatrzymana (paused) i przewijana ręcznie: window.__seek(sekundy).
   Dzięki temu każda klatka jest deterministyczna — render w Playwright
   ustawia czas, robi zrzut, i tak 450 razy.

   Podgląd w przeglądarce (bez ?raw=1) odtwarza animację w pętli
   i dodaje suwak czasu.
   ============================================================ */

(() => {
  const DUR = 15;                 // s — długość filmu
  const FPS = 30;
  const EASE = 'cubic-bezier(.4,0,.2,1)';          // łagodne wejście/wyjście
  const EASE_OUT = 'cubic-bezier(.2,.7,.2,1)';     // dojazd (kamera, slide)
  const EASE_IN = 'cubic-bezier(.5,0,.8,.4)';

  const $ = id => document.getElementById(id);
  const anims = [];

  /* frames: [{ t, easing?, ...właściwości CSS }] — t w sekundach.
     Helper dokleja klatkę na 0 s i 15 s, żeby fill:both trzymał wartości. */
  function tween(el, frames) {
    if (!el) throw new Error('tween: brak elementu');
    const f = frames.slice().sort((a, b) => a.t - b.t);
    if (f[0].t > 0) f.unshift({ ...f[0], t: 0 });
    if (f[f.length - 1].t < DUR) f.push({ ...f[f.length - 1], t: DUR });
    const kfs = f.map(({ t, easing, ...props }) => ({ offset: t / DUR, easing: easing || EASE, ...props }));
    const a = el.animate(kfs, { duration: DUR * 1000, fill: 'both' });
    a.pause();
    anims.push(a);
    return a;
  }

  // wartości niestandardowe (--on) muszą być zarejestrowane, żeby dały się animować
  if (window.CSS && CSS.registerProperty) {
    try { CSS.registerProperty({ name: '--on', syntax: '<number>', inherits: true, initialValue: 0 }); } catch { /* już jest */ }
  }

  /* ---------- pomocnicze ---------- */
  const deg = v => `${v}deg`;
  const phoneT = (ry, rx, rz = 0) =>
    `perspective(1400px) rotateY(${deg(ry)}) rotateX(${deg(rx)}) rotateZ(${deg(rz)})`;
  const THICK = 50;   // grubość telefonu w px układu telefonu (≈ 8 mm : 71 mm szerokości)
  const edgeW = ry => `${(THICK * Math.sin(Math.abs(ry) * Math.PI / 180)).toFixed(2)}px`;
  const edgeH = rx => `${(THICK * Math.sin(Math.abs(rx) * Math.PI / 180) * 0.6).toFixed(2)}px`;

  /* ============================================================
     1. Kamera, telefon, światło
     ============================================================ */
  // pozycja i skala telefonu w kadrze
  // (.zoom ma na stałe zoom 1.72 → telefon szer. 430 px ≈ 740 px w kadrze 1080;
  //  tu skalujemy tylko względem tej wielkości)
  const ZOOM = 1.72;
  const rigT = (x, y, s) => `translate(${x}px, ${y}px) scale(${(s / ZOOM).toFixed(4)})`;
  tween($('rig'), [
    { t: 0.0,  transform: rigT(0, 70, 1.56), easing: EASE_OUT },
    { t: 2.3,  transform: rigT(0, 0, ZOOM) },
    { t: 12.4, transform: rigT(0, 0, ZOOM), easing: EASE },
    { t: 14.1, transform: rigT(96, 350, 1.06) },
  ]);
  // delikatny najazd kamery przez całą część „produktową”
  tween($('camera'), [
    { t: 2.3,  transform: 'scale(1)' , easing: 'linear' },
    { t: 12.4, transform: 'scale(1.035)', easing: EASE },
    { t: 14.1, transform: 'scale(1)' },
  ]);
  // obrót telefonu w przestrzeni
  const rot = [
    { t: 0.0,  ry: -24, rx: 7,  rz: 0,   easing: EASE_OUT },
    { t: 2.3,  ry: -9,  rx: 3,  rz: 0 },
    { t: 7.4,  ry: -5,  rx: 2,  rz: 0 },
    { t: 12.4, ry: -8,  rx: 3,  rz: 0 },
    { t: 14.1, ry: -17, rx: 4,  rz: -7 },
  ];
  tween($('phone'), rot.map(k => ({ t: k.t, easing: k.easing, transform: phoneT(k.ry, k.rx, k.rz) })));
  tween($('edgeR'), rot.map(k => ({ t: k.t, easing: k.easing, width: edgeW(k.ry) })));
  tween($('edgeB'), rot.map(k => ({ t: k.t, easing: k.easing, height: edgeH(k.rx) })));

  // pojawienie się telefonu
  tween($('phone'), [
    { t: 0.0, opacity: 0, easing: EASE_OUT },
    { t: 1.0, opacity: 1 },
  ]);
  tween($('shadow'), [
    { t: 0.0, opacity: 0, transform: 'translateY(60px) scale(.9)', easing: EASE_OUT },
    { t: 1.4, opacity: 1, transform: 'translateY(0px) scale(1)' },
    { t: 12.4, opacity: 1, transform: 'translateY(0px) scale(1)' },
    { t: 14.1, opacity: .8, transform: 'translateY(30px) scale(1.05)' },
  ]);
  // przesuwający się rozbłysk na ramce (raz na wejściu, raz na wyjściu)
  tween($('shine'), [
    { t: 0.2,  backgroundPosition: '100% 0', easing: EASE },
    { t: 2.6,  backgroundPosition: '0% 0' },
    { t: 12.4, backgroundPosition: '0% 0', easing: EASE },
    { t: 14.4, backgroundPosition: '100% 0' },
  ]);

  /* ============================================================
     2. Przejścia między ekranami (slide + fade)
     ============================================================ */
  const T12 = 3.5, T23 = 8.45, SLIDE = 0.62;
  tween($('s1'), [
    { t: T12,         transform: 'translateX(0px)',    opacity: 1, easing: EASE_OUT },
    { t: T12 + SLIDE, transform: 'translateX(-110px)', opacity: 0 },
  ]);
  tween($('s2'), [
    { t: T12,         transform: 'translateX(393px)',  opacity: 1, easing: EASE_OUT },
    { t: T12 + SLIDE, transform: 'translateX(0px)',    opacity: 1 },
    { t: T23,         transform: 'translateX(0px)',    opacity: 1, easing: EASE_OUT },
    { t: T23 + SLIDE, transform: 'translateX(-110px)', opacity: 0 },
  ]);
  tween($('s3'), [
    { t: T23,         transform: 'translateX(393px)', easing: EASE_OUT },
    { t: T23 + SLIDE, transform: 'translateX(0px)' },
  ]);

  /* ============================================================
     3. Gest dotknięcia — ścieżka i „kliknięcia”
     ============================================================ */
  const moves = [];   // klatki pozycji/opacity wskaźnika
  const taps = [];    // momenty dotknięć

  // pojawienie się w punkcie A, dojazd do B, opcjonalnie dotknięcie
  const appear = (t, x, y) => moves.push({ t, x, y, o: 0 }, { t: t + 0.25, x, y, o: 1, hold: true });
  const moveTo = (t, x, y) => moves.push({ t, x, y, o: 1 });
  const hide = t => moves.push({ t, o: 0 });
  const tap = (t, quick = false) => taps.push({ t, quick });

  // ekran 1: adres „Pimpickiego 16” (środek wiersza ≈ 150, 420)
  appear(2.15, 250, 640);  moveTo(2.95, 150, 420);  tap(3.0);  hide(3.5);
  // ekran 2: rozwinięcie PLASTIK — chevron (343, 460 po przewinięciu)
  appear(5.95, 280, 610);  moveTo(6.35, 343, 460);  tap(6.4);  hide(6.95);
  // ekran 2: dzwonek (353, 104)
  appear(7.45, 280, 330);  moveTo(7.95, 353, 104);  tap(8.0);  hide(8.45);
  // ekran 3: główny przełącznik (329, 184), rodzaje odpadów, godzina 19:00 (196, 756)
  appear(9.05, 280, 430);  moveTo(9.45, 329, 184);  tap(9.5);
  moveTo(9.9, 329, 309);   tap(9.95, true);
  moveTo(10.15, 329, 362); tap(10.2, true);
  moveTo(10.4, 329, 415);  tap(10.45, true);
  moveTo(10.65, 329, 468); tap(10.7, true);
  moveTo(11.0, 329, 627);  tap(11.05);
  moveTo(11.45, 196, 756); tap(11.5);  hide(11.95);

  // zamiana listy ruchów na klatki (pozycja utrzymywana, gdy zmienia się tylko opacity)
  {
    let last = { x: 0, y: 0 };
    const frames = moves.map(m => {
      const x = m.x ?? last.x, y = m.y ?? last.y;
      last = { x, y };
      return { t: m.t, transform: `translate(${x}px, ${y}px)`, opacity: m.o, easing: EASE };
    });
    tween($('touch'), frames);
  }
  // „wciśnięcie” kropki i rozchodzący się pierścień
  {
    const dot = [], ring = [];
    taps.forEach(({ t, quick }, i) => {
      const next = taps[i + 1]?.t ?? DUR;
      const press = Math.min(quick ? 0.14 : 0.28, next - t - 0.04);
      const ringDur = Math.min(quick ? 0.22 : 0.5, next - t - 0.03);
      dot.push({ t: t - 0.08, transform: 'scale(1)', easing: EASE_IN },
               { t,           transform: 'scale(.72)', easing: EASE_OUT },
               { t: t + press, transform: 'scale(1)' });
      ring.push({ t: t - 0.001, transform: 'scale(.8)', opacity: 0, easing: 'linear' },
                { t,            transform: 'scale(.8)', opacity: .9, easing: EASE_OUT },
                { t: t + ringDur, transform: 'scale(2.4)', opacity: 0, easing: 'linear' });
    });
    tween($('touchDot'), dot);
    tween($('touchRing'), ring);
  }

  /* ============================================================
     4. Ekran 1 — reakcja adresu na dotknięcie
     ============================================================ */
  tween($('addr1hl'), [
    { t: 2.99, opacity: 0, easing: EASE_OUT },
    { t: 3.08, opacity: .95 },
  ]);
  tween($('addr1'), [
    { t: 2.99, transform: 'scale(1)', easing: EASE_OUT },
    { t: 3.14, transform: 'scale(1.035)', easing: EASE },
    { t: 3.5,  transform: 'scale(1.035)' },
  ]);

  /* ============================================================
     5. Ekran 2 — przewinięcie listy, rozwinięcie PLASTIK, puls dzwonka
     ============================================================ */
  tween($('list'), [
    { t: 4.6, transform: 'translateY(0px)', easing: 'cubic-bezier(.45,0,.15,1)' },
    { t: 5.75, transform: 'translateY(-230px)' },
  ]);
  const EXP = 6.42, EXPD = 0.42;
  tween($('plastikNext'), [
    { t: EXP,        height: '0px',  opacity: 0, marginTop: '0px', easing: EASE_OUT },
    { t: EXP + EXPD, height: '30px', opacity: 1, marginTop: '12px' },
  ]);
  tween($('plastikChev'), [
    { t: EXP,        transform: 'rotate(0deg)', easing: EASE_OUT },
    { t: EXP + EXPD, transform: 'rotate(180deg)' },
  ]);
  tween($('plastikChip'), [
    { t: EXP - 0.02, transform: 'scale(1)', easing: EASE_OUT },
    { t: EXP + 0.12, transform: 'scale(1.05)', easing: EASE },
    { t: EXP + 0.4,  transform: 'scale(1)' },
  ]);
  // puls dzwonka: poświata + dwa pierścienie
  tween($('bell'), [
    { t: 7.1, boxShadow: '0 0 0 0 rgba(245,214,107,0)', easing: EASE_OUT },
    { t: 7.4, boxShadow: '0 0 26px 6px rgba(245,214,107,.55)', easing: EASE },
    { t: 7.75, boxShadow: '0 0 10px 2px rgba(245,214,107,.25)', easing: EASE_OUT },
    { t: 8.0, boxShadow: '0 0 26px 6px rgba(245,214,107,.55)', easing: EASE },
    { t: 8.45, boxShadow: '0 0 0 0 rgba(245,214,107,0)' },
  ]);
  tween($('bellPulse'), [
    { t: 7.1,  transform: 'scale(.9)', opacity: 0, easing: 'linear' },
    { t: 7.12, transform: 'scale(.9)', opacity: .9, easing: EASE_OUT },
    { t: 7.7,  transform: 'scale(1.7)', opacity: 0, easing: 'linear' },
    { t: 7.72, transform: 'scale(.9)', opacity: .9, easing: EASE_OUT },
    { t: 8.3,  transform: 'scale(1.7)', opacity: 0 },
  ]);

  /* ============================================================
     6. Ekran 3 — przełączniki, godzina, toast
     ============================================================ */
  const flip = (id, t, d = 0.32) => tween($(id), [
    { t, '--on': 0, easing: EASE },
    { t: t + d, '--on': 1 },
  ]);
  flip('tgMaster', 9.5);
  flip('tgSz', 9.95, 0.26);
  flip('tgPa', 10.2, 0.26);
  flip('tgBi', 10.45, 0.26);
  flip('tgPl', 10.7, 0.26);
  flip('tgZm', 11.05, 0.3);

  // czarna pastylka przesuwa się z 17:00 na 19:00, kolory napisów zamieniają się
  const HT = 11.5, HD = 0.4;
  tween($('hourMarker'), [
    { t: HT,      transform: 'translateX(0%)', easing: 'cubic-bezier(.3,.9,.3,1.1)' },
    { t: HT + HD, transform: 'translateX(calc(100% + 10px))' },
  ]);
  tween($('h17'), [{ t: HT, color: '#ffffff', easing: EASE }, { t: HT + HD * .8, color: '#2E7E8C' }]);
  tween($('h19'), [{ t: HT, color: '#2E7E8C', easing: EASE }, { t: HT + HD * .8, color: '#ffffff' }]);

  // toast potwierdzenia
  tween($('toast'), [
    { t: 11.95, transform: 'translate(-50%, 34px) scale(.96)', opacity: 0, easing: 'cubic-bezier(.2,.9,.3,1.15)' },
    { t: 12.4,  transform: 'translate(-50%, 0px) scale(1)',     opacity: 1 },
  ]);

  /* ============================================================
     7. Napisy końcowe
     ============================================================ */
  tween($('outro'), [
    { t: 12.9, opacity: 0, transform: 'translateY(46px)', easing: EASE_OUT },
    { t: 13.8, opacity: 1, transform: 'translateY(0px)' },
  ]);

  /* ============================================================
     API sterowania czasem
     ============================================================ */
  const seek = sec => {
    const ms = Math.max(0, Math.min(DUR, sec)) * 1000;
    for (const a of anims) a.currentTime = ms;
    return ms / 1000;
  };
  window.__seek = seek;
  window.__frames = () => DUR * FPS;
  window.__fps = FPS;
  window.__duration = DUR;
  window.__ready = Promise.race([document.fonts.ready, new Promise(r => setTimeout(r, 6000))]).then(() => true);
  seek(0);

  /* ---------- podgląd w przeglądarce ---------- */
  const raw = new URLSearchParams(location.search).has('raw');
  if (!raw) {
    document.body.classList.add('preview');
    const stage = $('stage'), hud = $('hud'), range = $('hudRange'), time = $('hudTime');
    hud.hidden = false;
    const fit = () => {
      const s = Math.min(innerWidth / 1080, (innerHeight - 8) / 1920);
      stage.style.transform = `scale(${s})`;
      stage.style.margin = `${-(1920 - 1920 * s) / 2}px ${-(1080 - 1080 * s) / 2}px`;
    };
    addEventListener('resize', fit); fit();

    let playing = true, t = 0, last = performance.now();
    const step = now => {
      const dt = (now - last) / 1000; last = now;
      if (playing) { t += dt; if (t > DUR + 0.8) t = 0; }
      const shown = seek(t);
      range.value = shown; time.textContent = shown.toFixed(2);
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
    range.addEventListener('input', () => { playing = false; t = Number(range.value); });
    $('hudPlay').addEventListener('click', () => playing = !playing);
    addEventListener('keydown', e => {
      if (e.code === 'Space') { e.preventDefault(); playing = !playing; }
      if (e.code === 'ArrowRight') { playing = false; t = Math.min(DUR, t + 1 / FPS); }
      if (e.code === 'ArrowLeft')  { playing = false; t = Math.max(0, t - 1 / FPS); }
    });
  }
})();
