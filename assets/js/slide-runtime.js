/* ============================================================
   Runtime pojedynczego slajdu.
   - dopasowuje podgląd do okna przeglądarki
   - w trybie ?raw=1 zostawia slajd 1:1 (eksport / studio)
   - ostrzega w konsoli, gdy treść nie mieści się na slajdzie
   ============================================================ */
(function () {
  var raw = new URLSearchParams(location.search).has('raw');
  var slide = document.querySelector('.slide');
  if (!slide) return;

  if (raw) {
    document.body.classList.add('raw');
  } else {
    var wrap = document.createElement('div');
    wrap.className = 'fit-wrap';
    slide.parentNode.insertBefore(wrap, slide);
    wrap.appendChild(slide);

    var fit = function () {
      var pad = 56;
      var s = Math.min(
        (window.innerWidth - pad) / slide.offsetWidth,
        (window.innerHeight - pad) / slide.offsetHeight,
        1
      );
      slide.style.setProperty('--fit', s);
      wrap.style.width = slide.offsetWidth * s + 'px';
      wrap.style.height = slide.offsetHeight * s + 'px';
    };
    window.addEventListener('resize', fit);
    fit();
  }

  // kontrola przepełnienia — przydatne po zmianie tekstów
  var check = function () {
    var c = slide.querySelector('.slide__content');
    if (!c) return;
    var over = c.scrollHeight - c.clientHeight;
    slide.dataset.overflow = over > 1 ? String(over) : '0';
    if (over > 1) {
      console.warn('[VIBE] Slajd ' + (slide.dataset.slide || '?') +
        ': treść wychodzi poza kadr o ' + over + ' px. Skróć tekst lub zmniejsz font.');
    }
  };
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(function () { setTimeout(check, 60); });
  } else {
    window.addEventListener('load', check);
  }
})();
