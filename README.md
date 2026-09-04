# VIBE SOCIAL CLUB — karuzela na Instagram

Grafiki z materiałów wydarzenia rozbite na **7 edytowalnych slajdów 1080 × 1350**
(format 4:5, czyli karuzela IG). Każdy slajd to zwykły plik HTML — tekst, kolory
i odstępy zmieniasz w kodzie albo klikając w podglądzie, a gotowe PNG-i generuje
jedna komenda.

```
slides/          ← 7 slajdów, tu wprowadzasz ostateczne zmiany
assets/css/      ← brand.css (kolory, fonty), slides.css (komponenty)
assets/img/      ← tu wrzucasz zdjęcia tła
assets/fonts/    ← kroje w repo, projekt działa też bez internetu
export/          ← wygenerowane PNG-i (w repo leżą podglądy 1×)
index.html       ← studio: podgląd, podmiana zdjęć, edycja tekstu
```

## Slajdy

| # | Plik | Co jest na slajdzie |
|---|------|---------------------|
| 01 | `01-okladka.html` | Okładka — VIBE SOCIAL CLUB, Rooftop Edition, dwie tury, 22.08 |
| 02 | `02-small-groups.html` | Small groups. Real connections. — format kameralny |
| 03 | `03-morning-vibe.html` | MORNING VIBE 9:00–12:00, partner poranka: Tatarak |
| 04 | `04-sunset-vibe.html` | SUNSET VIBE 18:00–21:00, partner wieczoru: Highlander |
| 05 | `05-bilety.html` | Cennik, Early Vibe, Fitssey, voucher |
| 06 | `06-zapisy.html` | „Przyjdź dla VIBE. Zostań dla ludzi.” + zapisy |
| 07 | `07-okladka-alt.html` | Okładka alternatywna (granatowa) — zamiennik slajdu 01 |

Slajdy 04 i 07 nie były w oryginalnych materiałach — 04 to bliźniak Morning Vibe
zrobiony pod turę wieczorną, 07 to druga wersja okładki. Jeśli któryś jest zbędny,
skasuj plik: reszta działa dalej.

## Start

```bash
npm install     # jednorazowo (Playwright do eksportu PNG)
npm start       # studio → http://localhost:8080
npm run export  # wszystkie slajdy do export/*.png w 2160×2700
```

Bez Node też się obejdzie — pliki z `slides/` otwierasz podwójnym kliknięciem
w przeglądarce. Wtedy działa podgląd, ale nie edycja w studiu ani eksport.

## Jak wprowadzać zmiany

**1. Zdjęcia tła** — wrzuć plik do `assets/img/` pod nazwą taką jak slajd
(`01-okladka.jpg`, `03-morning-vibe.jpg`, …). Zastąpi tło rysowane gradientem.
Szczegóły i wymiary: `assets/img/README.md`.

**2. Teksty** — otwórz plik slajdu i edytuj treść między znacznikami. Wszystko,
co da się zmieniać, ma atrybut `data-edit`:

```html
<div class="time-block__hours" data-edit>9:00–12:00</div>
```

**3. Kolory i kroje** — `assets/css/brand.css`. Jedna zmiana działa na wszystkich
slajdach naraz:

```css
--rose-300: #E4A7AC;   /* róż tytułów */
--terracotta: #C0575C; /* akcent Morning Vibe */
--f-display: "Cormorant Garamond", …;
```

**4. Układ jednego slajdu** — każdy plik ma własny blok `<style>` z regułami
tylko dla siebie (`[data-slide="03"] …`). Zmiany tam nie ruszają reszty karuzeli.

**5. Studio** (`npm start`) — do szybkiego próbowania: przeciągnij zdjęcie na
podgląd, ustaw kadr suwakami, włącz „Edycja tekstu” i pisz wprost na slajdzie,
pobierz PNG. Zmiany ze studia siedzą w pamięci przeglądarki — wersją źródłową
zawsze pozostają pliki w `slides/`. Przycisk „Kopiuj HTML slajdu” przenosi
poprawki ze studia z powrotem do kodu.

## Eksport

```bash
npm run export              # 2160 × 2700 (2×) — domyślne, do publikacji
npm run export -- --scale=1 # 1080 × 1350
npm run export -- --only=03 # jeden slajd
npm run export:jpg          # dodatkowo JPG
```

Eksport pilnuje kadru: jeśli po zmianie tekstu treść nie mieści się na slajdzie,
w konsoli pojawi się ostrzeżenie z liczbą pikseli nadmiaru (to samo pokazuje
studio czerwoną etykietą przy slajdzie).

## Kroje pisma

W repo leżą gotowe pliki w `assets/fonts/` — Cormorant Garamond (tytuły),
Jost (teksty) i Parisienne (pismo odręczne). Dzięki temu render jest zawsze taki
sam i nie zależy od internetu. Zmiana krojów: podmień listę w
`scripts/fetch-fonts.mjs`, uruchom `node scripts/fetch-fonts.mjs`, popraw
`--f-display` / `--f-sans` / `--f-script` w `assets/css/brand.css`.

## Animacja promo „Harmonogram wywozu śmieci”

W katalogu `promo-harmonogram/` leży osobny projekt: 15-sekundowa animacja
aplikacji mobilnej w mockupie telefonu (9:16, 1080 × 1920, 30 kl./s) do
publikacji jako Reel / TikTok / Short. Gotowy film: `promo-harmonogram/export/harmonogram-promo.mp4`.

```bash
npm run promo          # podgląd z suwakiem czasu
npm run promo:render   # render do MP4 (Playwright + ffmpeg)
```

Szczegóły, przebieg sekunda po sekundzie i instrukcja zmian:
[`promo-harmonogram/README.md`](promo-harmonogram/README.md).

## Uwagi

- Logotypy partnerów (VIBE, Nad Zatoką, Tatarak, Highlander) są złożone
  z tekstu i prostych ikon — jeśli masz oryginalne pliki logo, podmień je
  w blokach `.logo` / `<svg>`.
- Ikony to inline SVG w plikach slajdów — edytujesz je wprost w kodzie.
- Kolejność w karuzeli = kolejność plików w `slides/`. Chcesz przestawić —
  zmień numer na początku nazwy pliku.
