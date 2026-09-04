# Harmonogram wywozu śmieci — animacja promo (Reel / TikTok / Short)

15-sekundowa animacja aplikacji mobilnej w mockupie telefonu, pion 9:16,
**1080 × 1920, 30 kl./s, H.264 MP4**. Cała scena to zwykły HTML + CSS,
a ruch jest zapisany jako jedna oś czasu w `assets/timeline.js` — render robi
z tego 450 klatek i skleja film.

```
promo-harmonogram/
├── index.html            ← scena: tło, telefon, trzy ekrany aplikacji, napisy
├── assets/
│   ├── scene.css         ← tło studyjne, mockup telefonu, napisy końcowe
│   ├── screens.css       ← ekrany aplikacji (adres, harmonogram, powiadomienia)
│   ├── timeline.js       ← OŚ CZASU: co, kiedy i jak się porusza
│   ├── fonts.css + fonts/← Poppins (lokalnie, render nie zależy od internetu)
└── export/
    ├── harmonogram-promo.mp4          ← gotowy film
    └── harmonogram-promo-poster.jpg   ← klatka-okładka (ostatnia klatka)
```

## Start

```bash
npm install            # jednorazowo (Playwright)
npm run promo          # podgląd w przeglądarce z suwakiem czasu
npm run promo:render   # → export/harmonogram-promo.mp4
```

Podgląd (`npm run promo`) odtwarza animację w pętli; spacja = pauza,
strzałki ← → = klatka po klatce, suwak na dole = przewijanie.

Render wymaga **ffmpeg z libx264**. Skrypt szuka go w tej kolejności:
`--ffmpeg=/ścieżka`, zmienna `FFMPEG`, `ffmpeg` w PATH, pakiet npm
`ffmpeg-static`, pakiet Pythona `imageio-ffmpeg`. Jeśli żadnego nie ma:

```bash
npm i -D ffmpeg-static          # albo:  pip install imageio-ffmpeg
```

Przydatne warianty:

```bash
npm run promo:render -- --at=3.2         # jedna klatka PNG z czasu 3,2 s (export/preview/)
npm run promo:render -- --at=1,4,8,14    # kilka klatek podglądu
npm run promo:frames                     # tylko sekwencja PNG, bez ffmpeg
npm run promo:render -- --keep-frames    # zostaw klatki po zakodowaniu
npm run promo:render -- --encode-only    # tylko ffmpeg z istniejących klatek (np. po zmianie ustawień kodeka)
```

## Przebieg (sekundy)

| Czas | Co się dzieje |
|------|---------------|
| 0,0 – 2,3 | Telefon wjeżdża na ciemne tło, obraca się z −24° do −9°, przejeżdża rozbłysk po ramce |
| 2,2 – 3,5 | Ekran **Wybór adresu**; gest dotyka „Pimpickiego 16” — wiersz podświetla się na żółto i powiększa |
| 3,5 – 4,1 | Przejście slide + fade do **Harmonogramu** |
| 4,6 – 5,8 | Lista terminów przewija się w pionie do karty „Czwartek 7 lipiec” |
| 6,4 – 6,9 | Rozwinięcie **PLASTIK** → chipy „Kolejne: śr. 7 lip · pt. 18 lip · nd. 24 lip” |
| 7,1 – 8,0 | Dzwonek pulsuje (poświata + pierścienie), gest go dotyka |
| 8,45 – 9,1 | Przejście do **Powiadomień** |
| 9,5 – 11,1 | Włączenie głównego przełącznika, potem SZKŁO, PAPIER, BIOODPADY, PLASTIK, ODPADY ZMIESZANE |
| 11,5 | Czarna pastylka godziny przesuwa się z 17:00 na **19:00** |
| 12,0 – 12,4 | Snackbar „Przypomnienie zostało ustawione” |
| 12,4 – 14,1 | Telefon zjeżdża w dół kadru, przechyla się; pojawia się hasło |
| 13,8 – 15,0 | Stopklatka: „Twój harmonogram. Zawsze pod ręką.” / „Sprawdź terminy i ustaw przypomnienia.” |

## Jak zmieniać

- **Teksty na ekranach** — wprost w `index.html` (sekcje `.s1`, `.s2`, `.s3`).
- **Czas i ruch** — `assets/timeline.js`. Każdy element ma listę klatek
  `{ t: sekunda, właściwość: wartość }`; między klatkami wartości są
  interpolowane. Gesty dotknięcia to kilka linijek `appear / moveTo / tap / hide`
  z współrzędnymi w układzie ekranu telefonu (393 × 852).
- **Hasło końcowe** — blok `.outro` w `index.html`, style w `scene.css`.
- **Kolory aplikacji** — zmienne `--app-bg`, `--teal`, `--yellow` w `scene.css`;
  kolory kategorii odpadów w `screens.css` (`.chip--*`, `.dot--*`).
- **Długość filmu** — stała `DUR` w `timeline.js` (klatki w tabeli powyżej
  liczą się od zera, więc wystarczy przesunąć te po zmianie).

## Uwagi techniczne

- Render jest **deterministyczny**: strona wystawia `window.__seek(sekundy)`,
  a wszystkie animacje to zatrzymane animacje Web Animations API przewijane
  do zadanej milisekundy. Ta sama klatka wygląda identycznie przy każdym renderze.
- Telefon jest powiększony właściwością `zoom`, a nie `transform`, dzięki czemu
  tekst na ekranie rasteryzuje się ostro w docelowej wielkości.
- MP4 kodowany jako H.264 High 4.1, `yuv420p`, CRF 17, `faststart` — profil
  akceptowany przez Instagram, TikTok i YouTube. Film nie ma ścieżki audio;
  muzykę dodaje się w aplikacji przy publikacji.
