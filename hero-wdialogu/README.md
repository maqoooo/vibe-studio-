# wdialogu — Asystent Deklaracji · animowana sekcja hero

Samodzielna, animowana wersja sekcji „Uprość formalności z Asystentem Deklaracji”.
Zero zależności (czysty HTML + CSS + JS), gotowa do wklejenia na dowolną stronę.

```
hero-wdialogu/
├── index.html   ← strona demo (nawigacja + sekcja + pasek logotypów)
├── hero.css     ← wszystkie style sekcji (prefiks .wd-, nie koliduje z Twoim CSS)
├── hero.js      ← sterowanie animacją (IntersectionObserver, pętla 3 kroków, efekt 3D)
└── README.md
```

## Co się dzieje w animacji

1. **Wejście sekcji** (po przewinięciu do widoku) — nagłówek „wyjeżdża” słowo po słowie,
   opis i przycisk wpływają z dołu, trzy karty wjeżdżają z lekkim obrotem, w tle
   powoli obracają się łuki, a kształty (romb, trójkąt) unoszą się.
2. **Zapętlona „opowieść” 3 kroków** (ok. 17 s, potem od nowa):
   - karta 1 — pola formularza wpisują się z kursorem, każde dostaje zielony „ptaszek”;
   - zielona kropka rysuje przerywaną ścieżkę do karty 2;
   - karta 2 — zębatki się kręcą, pasek 0 → 65 → 100 %, punkty listy zapalają się,
     wyskakuje odznaka ✓;
   - ścieżka rysuje się do karty 3;
   - karta 3 — kwota odlicza do **1500,00 PLN**, metody płatności podświetlają się
     na zmianę, przycisk „Zapłać teraz” błyska, wciska się i zmienia na „Opłacono”
     z konfetti.
3. **Interakcje** — karty lekko pochylają się w 3D za kursorem, przycisk CTA wypełnia
   się kolorem na hover, pasek logotypów przesuwa się w pętli (zatrzymuje się na hover).

Animacja respektuje `prefers-reduced-motion` (pokazuje stan końcowy bez ruchu)
i zatrzymuje pętlę, gdy karta przeglądarki jest w tle.

## Osadzenie na stronie — 3 kroki

1. Skopiuj `hero.css` i `hero.js` do swojego projektu i podłącz:

   ```html
   <link rel="stylesheet" href="/sciezka/hero.css">
   <!-- font (opcjonalnie — bez niego zadziała font systemowy) -->
   <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@500;600;700;800&display=swap" rel="stylesheet">
   ...
   <script src="/sciezka/hero.js" defer></script>
   ```

2. Z `index.html` skopiuj fragment między komentarzami
   `POCZĄTEK SEKCJI DO OSADZENIA` i `KONIEC SEKCJI DO OSADZENIA`
   (blok `<section class="wd-hero">…</section>` oraz opcjonalny `<div class="wd-logos">`).

3. Podmień treści: link przycisku `href="#rejestracja"`, nazwy i wartości pól
   (atrybuty `data-label` / `data-text` w `.wd-field__val`), kwotę (w `hero.js`,
   wywołanie `countTo(amount, 1500, 1400)`), logotypy w `.wd-logos__track`.

Nawigacja w `index.html` (`.demo-nav`) to tylko element demo — użyj własnego menu.

## Dostosowanie

Kolory i cienie są zmiennymi CSS na `.wd-hero` (`--wd-green`, `--wd-navy`,
`--wd-yellow`, `--wd-teal`…). Tempo animacji: opóźnienia `--d` w HTML (wejście)
oraz wartości `sleep(...)` w `hero.js` (pętla). Poniżej 900 px karty ustawiają się
w kolumnie, ścieżka jest ukryta, a efekt 3D wyłączony.

## WordPress / kreatory stron

Wklej HTML sekcji w blok „Własny HTML”, a `hero.css` i `hero.js` dodaj przez
motyw (Additional CSS / wp_enqueue_script) lub w tym samym bloku jako
`<style>…</style>` i `<script>…</script>`.
