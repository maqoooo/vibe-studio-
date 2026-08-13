# Zdjęcia tła

Wrzuć tutaj zdjęcia pod **dokładnie takimi nazwami** — podmienią się automatycznie,
nic nie trzeba zmieniać w kodzie:

| Plik                      | Slajd                  |
|---------------------------|------------------------|
| `01-okladka.jpg`          | 01 — Okładka           |
| `02-small-groups.jpg`     | 02 — Small groups      |
| `03-morning-vibe.jpg`     | 03 — Morning Vibe      |
| `04-sunset-vibe.jpg`      | 04 — Sunset Vibe       |
| `05-bilety.jpg`           | 05 — Bilety            |
| `06-zapisy.jpg`           | 06 — Zapisy / CTA      |
| `07-okladka-alt.jpg`      | 07 — Okładka ALT       |

**Zalecenia**

- proporcje **4:5**, minimum **1080 × 1350 px** (lepiej 2160 × 2700)
- format `.jpg` — a jeśli wolisz `.png`, popraw rozszerzenie w pliku slajdu
  (linia `<div class="slide__photo" style="background-image: url(...)">`)
- zdjęcie jest kadrowane jak `background-size: cover`, czyli wypełnia slajd
  i przycina nadmiar — kadr ustawisz suwakami w studiu (`npm start`)
- jasne zdjęcia pod slajdy 01, 03, 04, 07; ciemne pod 02, 05, 06

**Dopóki pliku nie ma**, slajd rysuje tło gradientem z CSS — to celowe,
żeby projekt zawsze się renderował. Nic się nie psuje.
