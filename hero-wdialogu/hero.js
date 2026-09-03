/* ============================================================
   wdialogu — Asystent Deklaracji · sterowanie animacją
   1. Wejście sekcji (IntersectionObserver → klasa .is-visible)
   2. Zapętlona „opowieść” 3 kroków: formularz → weryfikacja → płatność
   3. Delikatny efekt 3D kart pod kursorem
   Bez zależności. Działa na każdej stronie: wystarczy <section class="wd-hero">.
   ============================================================ */
(function () {
  'use strict';

  const root = document.querySelector('.wd-hero');
  if (!root) return;

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  /* ---------- pomocnicze ---------- */
  const $ = (sel, ctx = root) => ctx.querySelector(sel);
  const $$ = (sel, ctx = root) => Array.from(ctx.querySelectorAll(sel));

  const cards = [$('.wd-card--1'), $('.wd-card--2'), $('.wd-card--3')];
  const fields = $$('.wd-field');
  const pct = $('.wd-progress__pct');
  const fill = $('.wd-progress__fill');
  const steps = $$('.wd-steps li');
  const amount = $('.wd-pay__amount .wd-num');
  const methods = $$('.wd-method');
  const payBtn = $('.wd-btn-pay');
  const runner = $('.wd-path__runner');
  const nodes = $$('.wd-path__node');
  const pathLine = $('.wd-path__line');
  const pathProg = $('.wd-path__progress');

  /* ---------- 1. wejście ---------- */
  let started = false;
  const start = () => {
    if (started) return;
    started = true;
    root.classList.add('is-visible');
    if (!reduced) setTimeout(loop, 1900);
    else finalState();
  };

  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) { start(); io.disconnect(); }
    }, { threshold: 0.25 });
    io.observe(root);
  } else {
    start();
  }

  /* ---------- pomocnicze do ścieżki ---------- */
  const scene = $('.wd-scene');
  const pathSvg = $('.wd-path');
  const anchors = $$('.wd-card__anchor');
  let pathLen = 0;

  /** Buduje falistą ścieżkę przez dolne punkty kart na podstawie ich realnych pozycji. */
  function buildPath() {
    if (!pathSvg || !pathProg || anchors.length < 2) return;
    const sr = scene.getBoundingClientRect();
    pathSvg.setAttribute('viewBox', `0 0 ${sr.width} ${sr.height}`);
    pathSvg.setAttribute('width', sr.width);
    pathSvg.setAttribute('height', sr.height);

    const pts = anchors.map((a) => {
      const r = a.getBoundingClientRect();
      return { x: r.left + r.width / 2 - sr.left, y: r.top + r.height / 2 - sr.top };
    });
    const dip = Math.min(90, sr.height * 0.14);
    let d = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 1; i < pts.length; i++) {
      const p = pts[i - 1], q = pts[i], dx = q.x - p.x;
      d += ` C ${p.x + dx * 0.3} ${p.y + dip}, ${q.x - dx * 0.3} ${q.y + dip}, ${q.x} ${q.y}`;
    }
    pathLine.setAttribute('d', d);
    pathProg.setAttribute('d', d);
    nodes.forEach((n) => {
      const pt = pts[Number(n.dataset.card)];
      if (pt) { n.setAttribute('cx', pt.x); n.setAttribute('cy', pt.y); }
    });
    pathLen = pathProg.getTotalLength();
    const drawn = pathProg.dataset.progress ? Number(pathProg.dataset.progress) : 0;
    pathProg.style.strokeDasharray = `${pathLen} ${pathLen}`;
    pathProg.style.strokeDashoffset = pathLen * (1 - drawn);
  }
  window.addEventListener('resize', buildPath);

  function setProgress(p) {
    pathProg.dataset.progress = p;
    pathProg.style.strokeDashoffset = pathLen * (1 - p);
  }

  /** Rysuje fragment ścieżki od `from` do `to` (0–1) w czasie `ms`, przesuwając kropkę. */
  function drawPath(from, to, ms) {
    return new Promise((resolve) => {
      buildPath();
      if (!pathProg || pathLen === 0) return resolve();
      const t0 = performance.now();
      runner.classList.add('is-on');
      const frame = (now) => {
        const k = Math.min(1, (now - t0) / ms);
        const e = 1 - Math.pow(1 - k, 3); // easeOutCubic
        const p = from + (to - from) * e;
        setProgress(p);
        const pt = pathProg.getPointAtLength(pathLen * p);
        runner.setAttribute('cx', pt.x);
        runner.setAttribute('cy', pt.y);
        if (k < 1) requestAnimationFrame(frame);
        else { runner.classList.remove('is-on'); resolve(); }
      };
      requestAnimationFrame(frame);
    });
  }

  /* ---------- 2. sekwencja ---------- */
  const fieldTexts = fields.map((f) => $('.wd-field__val', f).dataset.text || '');

  async function typeInto(field, text) {
    const val = $('.wd-field__val', field);
    const label = val.dataset.label ? `${val.dataset.label} ` : '';
    field.classList.add('is-typing');
    val.innerHTML = `${label}<span class="wd-typed"></span><i class="wd-caret"></i>`;
    const typed = $('.wd-typed', val);
    for (let i = 1; i <= text.length; i++) {
      typed.textContent = text.slice(0, i);
      await sleep(38 + Math.random() * 40);
    }
    await sleep(160);
    field.classList.remove('is-typing');
    field.classList.add('is-ok');
  }

  function setActive(i) {
    cards.forEach((c, k) => {
      c.classList.toggle('is-active', k === i);
      if (k < i) c.classList.add('is-done');
    });
    nodes.forEach((n) => n.classList.toggle('is-on', Number(n.dataset.card) <= i));
  }

  function countTo(el, target, ms) {
    return new Promise((resolve) => {
      const t0 = performance.now();
      const fmt = (v) => v.toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      const frame = (now) => {
        const k = Math.min(1, (now - t0) / ms);
        const e = 1 - Math.pow(1 - k, 4);
        el.textContent = fmt(target * e);
        if (k < 1) requestAnimationFrame(frame); else resolve();
      };
      requestAnimationFrame(frame);
    });
  }

  function resetAll() {
    cards.forEach((c) => c.classList.remove('is-active', 'is-done', 'is-paid'));
    fields.forEach((f) => {
      f.classList.remove('is-ok', 'is-typing');
      const val = $('.wd-field__val', f);
      val.innerHTML = `${val.dataset.label ? val.dataset.label + ' ' : ''}<span class="wd-typed"></span><i class="wd-caret"></i>`;
    });
    fill.style.width = '0%';
    pct.textContent = '0%';
    steps.forEach((s) => s.classList.remove('is-on'));
    amount.textContent = '0,00';
    methods.forEach((m) => m.classList.remove('is-on'));
    payBtn.classList.remove('is-shine', 'is-pressed', 'is-paid');
    nodes.forEach((n) => n.classList.remove('is-on'));
    buildPath();
    setProgress(0);
  }

  function finalState() {
    fields.forEach((f, i) => {
      $('.wd-field__val', f).textContent = `${$('.wd-field__val', f).dataset.label || ''} ${fieldTexts[i]}`.trim();
      f.classList.add('is-ok');
    });
    fill.style.width = '65%'; pct.textContent = '65%';
    steps.forEach((s) => s.classList.add('is-on'));
    amount.textContent = '1500,00';
    methods[0]?.classList.add('is-on');
    cards.forEach((c) => c.classList.add('is-done'));
    nodes.forEach((n) => n.classList.add('is-on'));
    buildPath();
    setProgress(1);
  }

  async function loop() {
    resetAll();
    await sleep(300);

    /* KROK 1 — wypełnianie deklaracji */
    setActive(0);
    for (let i = 0; i < fields.length; i++) {
      await typeInto(fields[i], fieldTexts[i]);
      await sleep(180);
    }
    await sleep(500);

    /* przejście 1 → 2 */
    await drawPath(0, 0.5, 1300);
    cards[0].classList.remove('is-active'); cards[0].classList.add('is-done');

    /* KROK 2 — weryfikacja i wyliczenie */
    setActive(1);
    steps[0]?.classList.add('is-on');
    const fillTo = async (from, to, ms) => {
      const t0 = performance.now();
      await new Promise((res) => {
        const f = (now) => {
          const k = Math.min(1, (now - t0) / ms);
          const v = Math.round(from + (to - from) * (1 - Math.pow(1 - k, 2)));
          fill.style.width = v + '%'; pct.textContent = v + '%';
          if (k < 1) requestAnimationFrame(f); else res();
        };
        requestAnimationFrame(f);
      });
    };
    await fillTo(0, 65, 1500);
    await sleep(350);
    steps[1]?.classList.add('is-on');
    await fillTo(65, 100, 1000);
    await sleep(250);
    cards[1].classList.remove('is-active'); cards[1].classList.add('is-done');
    await sleep(500);

    /* przejście 2 → 3 */
    await drawPath(0.5, 1, 1300);

    /* KROK 3 — podsumowanie i płatność */
    setActive(2);
    await countTo(amount, 1500, 1400);
    await sleep(350);
    methods[0]?.classList.add('is-on');
    await sleep(700);
    methods[0]?.classList.remove('is-on');
    methods[1]?.classList.add('is-on');
    await sleep(700);
    payBtn.classList.add('is-shine');
    await sleep(700);
    payBtn.classList.add('is-pressed');
    await sleep(160);
    payBtn.classList.remove('is-pressed');
    payBtn.classList.add('is-paid');
    cards[2].classList.add('is-paid');
    await sleep(350);
    cards[2].classList.remove('is-active'); cards[2].classList.add('is-done');

    /* pauza na docenienie efektu i od nowa */
    await sleep(3200);
    if (document.hidden) {
      await new Promise((r) => document.addEventListener('visibilitychange', r, { once: true }));
    }
    loop();
  }

  /* ---------- konfetti (jednorazowo generujemy elementy) ---------- */
  const conf = $('.wd-confetti');
  if (conf) {
    const colors = ['#3ea637', '#f6d86e', '#1fc4b2', '#0f1b2d', '#8fd47f'];
    for (let i = 0; i < 18; i++) {
      const el = document.createElement('i');
      const ang = (Math.PI * 2 * i) / 18 + Math.random() * 0.4;
      const dist = 90 + Math.random() * 90;
      el.style.setProperty('--x', `${Math.cos(ang) * dist}px`);
      el.style.setProperty('--y', `${Math.sin(ang) * dist - 60}px`);
      el.style.setProperty('--r', `${Math.random() * 720 - 360}deg`);
      el.style.background = colors[i % colors.length];
      el.style.animationDelay = `${Math.random() * 0.12}s`;
      conf.appendChild(el);
    }
  }

  /* ---------- 3. efekt 3D pod kursorem ---------- */
  if (!reduced && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    let raf = 0;
    scene.addEventListener('pointermove', (e) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        cards.forEach((card) => {
          const r = card.getBoundingClientRect();
          const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
          const dx = (e.clientX - cx) / r.width, dy = (e.clientY - cy) / r.height;
          const dist = Math.hypot(dx, dy);
          const k = Math.max(0, 1 - dist / 1.4);
          card.style.setProperty('--ry', `${(dx * 10 * k).toFixed(2)}deg`);
          card.style.setProperty('--rx', `${(-dy * 10 * k).toFixed(2)}deg`);
          card.style.setProperty('--lift', `${(-8 * k).toFixed(1)}px`);
        });
      });
    });
    scene.addEventListener('pointerleave', () => {
      cards.forEach((card) => {
        card.style.setProperty('--ry', '0deg');
        card.style.setProperty('--rx', '0deg');
        card.style.setProperty('--lift', '0px');
      });
    });
  }
})();
