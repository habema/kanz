# Built-in media sources

The default pictures and the synthesized sounds are made here; the files they
produce are committed under `apps/web`. Their licenses are listed in
`apps/web/public/sounds/SOURCES.md`.

- `sounds.py` writes `correct`, `wrong`, `applause` and `clapping` (in
  `apps/web/public/sounds/`) and `background.mp3` (in `apps/web/src/assets/`).
  Needs [uv](https://docs.astral.sh/uv/) and `lame`:

  ```sh
  uv run --with numpy --with scipy python tools/media/sounds.py
  ```

- `kanz.html` and `kashkool.html` draw the كنز and كشكول pictures (fonts: Reem
  Kufi and Lalezar from Google Fonts, SIL Open Font License). Render them at
  1280×720 with a headless Chromium browser, for example:

  ```sh
  chrome --headless=new --hide-scrollbars --window-size=1280,720 \
    --virtual-time-budget=3000 --screenshot=kanz.png tools/media/kanz.html
  ```

  The كشكول picture is saved as JPEG (`kashkool.jpg`).
