/* ============================================================
   Oś czasu dla mockupu osadzonego na stronie (sekcja „Jak to działa”).

   Telefon stoi frontalnie i nieruchomo; animują się tylko ekrany:
   dotknięcie adresu → harmonogram (przewinięcie, PLASTIK) → dzwonek →
   powiadomienia (przełączniki, 19:00, potwierdzenie) → krótkie wygaszenie
   i pętla od początku. Te same momenty co w filmie promo, przesunięte
   o 1,5 s (bez ujęcia wejściowego) i zapętlone po 13 s.

   Animacja odtwarza się tylko, gdy telefon jest w kadrze.
   ============================================================ */

(() => {
  const DUR = 13;                 // s — długość pętli
  const SHIFT = -1.5;             // czasy z filmu promo minus ujęcie wejściowe
  const EASE = 'cubic-bezier(.4,0,.2,1)';
  const EASE_OUT = 'cubic-bezier(.2,.7,.2,1)';
  const EASE_IN = 'cubic-bezier(.5,0,.8,.4)';

  const root = document.getElementById('phoneEmbed');
  if (!root) return;
  const $ = id => root.querySelector('#' + id);
  const anims = [];

  function tween(el, frames) {
    if (!el) throw new Error('tween: brak elementu');
    const f = frames.slice().sort((a, b) => a.t - b.t);
    if (f[0].t > 0) f.unshift({ ...f[0], t: 0 });
    if (f[f.length - 1].t < DUR) f.push({ ...f[f.length - 1], t: DUR });
    const kfs = f.map(({ t, easing, ...props }) => ({ offset: Math.min(1, Math.max(0, t / DUR)), easing: easing || EASE, ...props }));
    const a = el.animate(kfs, { duration: DUR * 1000, fill: 'both' });
    a.pause();
    anims.push(a);
    return a;
  }
  const S = t => t + SHIFT;   // czas z filmu promo → czas pętli

  if (window.CSS && CSS.registerProperty) {
    try { CSS.registerProperty({ name: '--on', syntax: '<number>', inherits: true, initialValue: 0 }); } catch { /* już jest */ }
  }

  /* ---------- przejścia między ekranami ---------- */
  const T12 = S(3.5), T23 = S(8.45), SLIDE = 0.62;
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

  /* ---------- gest dotknięcia ---------- */
  const moves = [], taps = [];
  const appear = (t, x, y) => moves.push({ t: S(t), x, y, o: 0 }, { t: S(t) + 0.25, x, y, o: 1 });
  const moveTo = (t, x, y) => moves.push({ t: S(t), x, y, o: 1 });
  const hide = t => moves.push({ t: S(t), o: 0 });
  const tap = (t, quick = false) => taps.push({ t: S(t), quick });

  appear(2.15, 250, 640);  moveTo(2.95, 150, 420);  tap(3.0);  hide(3.5);
  appear(5.95, 280, 610);  moveTo(6.35, 343, 460);  tap(6.4);  hide(6.95);
  appear(7.45, 280, 330);  moveTo(7.95, 353, 104);  tap(8.0);  hide(8.45);
  appear(9.05, 280, 430);  moveTo(9.45, 329, 184);  tap(9.5);
  moveTo(9.9, 329, 309);   tap(9.95, true);
  moveTo(10.15, 329, 362); tap(10.2, true);
  moveTo(10.4, 329, 415);  tap(10.45, true);
  moveTo(10.65, 329, 468); tap(10.7, true);
  moveTo(11.0, 329, 627);  tap(11.05);
  moveTo(11.45, 196, 756); tap(11.5);  hide(11.95);

  {
    let last = { x: 0, y: 0 };
    tween($('touch'), moves.map(m => {
      const x = m.x ?? last.x, y = m.y ?? last.y; last = { x, y };
      return { t: m.t, transform: `translate(${x}px, ${y}px)`, opacity: m.o, easing: EASE };
    }));
    const dot = [], ring = [];
    taps.forEach(({ t, quick }, i) => {
      const next = taps[i + 1]?.t ?? DUR;
      const press = Math.min(quick ? 0.14 : 0.28, next - t - 0.04);
      const ringDur = Math.min(quick ? 0.22 : 0.5, next - t - 0.03);
      dot.push({ t: t - 0.08, transform: 'scale(1)', easing: EASE_IN },
               { t,           transform: 'scale(.72)', easing: EASE_OUT },
               { t: t + press, transform: 'scale(1)' });
      ring.push({ t: t - 0.001,  transform: 'scale(.8)', opacity: 0, easing: 'linear' },
                { t,             transform: 'scale(.8)', opacity: .9, easing: EASE_OUT },
                { t: t + ringDur, transform: 'scale(2.4)', opacity: 0, easing: 'linear' });
    });
    tween($('touchDot'), dot);
    tween($('touchRing'), ring);
  }

  /* ---------- ekran 1: reakcja adresu ---------- */
  tween($('addr1hl'), [{ t: S(2.99), opacity: 0, easing: EASE_OUT }, { t: S(3.08), opacity: .95 }]);
  tween($('addr1'), [
    { t: S(2.99), transform: 'scale(1)', easing: EASE_OUT },
    { t: S(3.14), transform: 'scale(1.035)' },
  ]);

  /* ---------- ekran 2: przewinięcie, PLASTIK, dzwonek ---------- */
  tween($('list'), [
    { t: S(4.6),  transform: 'translateY(0px)', easing: 'cubic-bezier(.45,0,.15,1)' },
    { t: S(5.75), transform: 'translateY(-230px)' },
  ]);
  const EXP = S(6.42), EXPD = 0.42;
  tween($('plastikNext'), [
    { t: EXP,        height: '0px',  opacity: 0, marginTop: '0px', easing: EASE_OUT },
    { t: EXP + EXPD, height: '30px', opacity: 1, marginTop: '12px' },
  ]);
  tween($('plastikChev'), [{ t: EXP, transform: 'rotate(0deg)', easing: EASE_OUT }, { t: EXP + EXPD, transform: 'rotate(180deg)' }]);
  tween($('plastikChip'), [
    { t: EXP - 0.02, transform: 'scale(1)', easing: EASE_OUT },
    { t: EXP + 0.12, transform: 'scale(1.05)' },
    { t: EXP + 0.4,  transform: 'scale(1)' },
  ]);
  tween($('bell'), [
    { t: S(7.1),  boxShadow: '0 0 0 0 rgba(245,214,107,0)', easing: EASE_OUT },
    { t: S(7.4),  boxShadow: '0 0 26px 6px rgba(245,214,107,.55)' },
    { t: S(7.75), boxShadow: '0 0 10px 2px rgba(245,214,107,.25)', easing: EASE_OUT },
    { t: S(8.0),  boxShadow: '0 0 26px 6px rgba(245,214,107,.55)' },
    { t: S(8.45), boxShadow: '0 0 0 0 rgba(245,214,107,0)' },
  ]);
  tween($('bellPulse'), [
    { t: S(7.1),  transform: 'scale(.9)', opacity: 0, easing: 'linear' },
    { t: S(7.12), transform: 'scale(.9)', opacity: .9, easing: EASE_OUT },
    { t: S(7.7),  transform: 'scale(1.7)', opacity: 0, easing: 'linear' },
    { t: S(7.72), transform: 'scale(.9)', opacity: .9, easing: EASE_OUT },
    { t: S(8.3),  transform: 'scale(1.7)', opacity: 0 },
  ]);

  /* ---------- ekran 3: przełączniki, godzina, potwierdzenie ---------- */
  const flip = (id, t, d = 0.32) => tween($(id), [{ t: S(t), '--on': 0, easing: EASE }, { t: S(t) + d, '--on': 1 }]);
  flip('tgMaster', 9.5);
  flip('tgSz', 9.95, 0.26); flip('tgPa', 10.2, 0.26); flip('tgBi', 10.45, 0.26);
  flip('tgPl', 10.7, 0.26); flip('tgZm', 11.05, 0.3);
  const HT = S(11.5), HD = 0.4;
  tween($('hourMarker'), [
    { t: HT,      transform: 'translateX(0%)', easing: 'cubic-bezier(.3,.9,.3,1.1)' },
    { t: HT + HD, transform: 'translateX(calc(100% + 10px))' },
  ]);
  tween($('h17'), [{ t: HT, color: '#ffffff' }, { t: HT + HD * .8, color: '#2E7E8C' }]);
  tween($('h19'), [{ t: HT, color: '#2E7E8C' }, { t: HT + HD * .8, color: '#ffffff' }]);
  tween($('toast'), [
    { t: S(11.95), transform: 'translate(-50%, 34px) scale(.96)', opacity: 0, easing: 'cubic-bezier(.2,.9,.3,1.15)' },
    { t: S(12.4),  transform: 'translate(-50%, 0px) scale(1)',    opacity: 1 },
  ]);

  /* ---------- zapętlenie: wygaszenie do koloru tła aplikacji ---------- */
  tween($('loopFade'), [
    { t: 0,         opacity: 1, easing: EASE_OUT },
    { t: 0.45,      opacity: 0 },
    { t: DUR - 0.5, opacity: 0, easing: EASE_IN },
    { t: DUR,       opacity: 1 },
  ]);

  /* ---------- odtwarzanie ---------- */
  const seek = sec => { const ms = sec * 1000; for (const a of anims) a.currentTime = ms; };
  seek(0);
  let t = 0, last = null, playing = false, raf = 0;
  const step = now => {
    if (last !== null) { t = (t + (now - last) / 1000) % DUR; }
    last = now;
    seek(t);
    raf = requestAnimationFrame(step);
  };
  const play = () => { if (playing) return; playing = true; last = null; raf = requestAnimationFrame(step); };
  const pause = () => { playing = false; cancelAnimationFrame(raf); };

  if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
    seek(S(12.4));   // stan końcowy: ustawione przypomnienie, bez ruchu
  } else if ('IntersectionObserver' in window) {
    new IntersectionObserver(es => es.forEach(e => e.isIntersecting ? play() : pause()), { threshold: .2 }).observe(root);
  } else {
    play();
  }
  document.addEventListener('visibilitychange', () => document.hidden ? pause() : (root.getBoundingClientRect().bottom > 0 && play()));
})();
