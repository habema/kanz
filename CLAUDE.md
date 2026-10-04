# Kanz (كنز) — live quiz game show

Open-source, self-hosted, Arabic (RTL) quiz. Runs on one laptop: the main screen (`/`) is shown to
the audience and is view-only. Everything is driven from `/admin` on another device: its التحكم tab
picks tiles, reveals answers, awards points, switches the screen view and plays sounds; its
التصحيحات tab renames teams and fixes plays. `/mc` is read-only for a co-host (board with كنز/كشكول
marked, open tile with its answer, standings). `/setup` edits the game itself; until a game has been
saved it is a first-run onboarding wizard (password → name → teams → questions → points/rounds →
كنز/كشكول media → review), the main screen shows the welcome (no background music) and `/admin`,
`/mc` redirect to `/`. One admin password (created by the first visitor) guards all three control
pages and every `/api/admin/*` route. User-facing docs: `docs/` (VitePress, published to GitHub Pages by
`.github/workflows/docs.yml`).

- Game configuration (`GameConfig`: title, points, categories/items, teams, rounds, media,
  soundboard) is one JSONB row, `game_config.id = 1`, edited from `/setup`; with no row, `sampleGame`
  is served and `configured` is false (onboarding not done). Stored rows pass through
  `migrateConfig` on load. Types, board building (`buildTiles`), validation, the schedule generator
  and summary, and the xlsx/csv importer/exporter live in `lib/game-core` (vitest tests next to them).
- Live state is one JSONB row, `live_game.id = 1` (`apps/api/src/lib/store.ts`). Routes:
  `routes/game.ts` (public `GET /game`), `routes/auth.ts` (password, login, logout),
  `routes/admin.ts` (live controls) and `routes/setup.ts` (config, reset, media upload); `routes/index.ts`
  mounts the last two under `/admin` behind `requireAdmin` (`lib/auth.ts`). Response shaping:
  `lib/present.ts`.
- API contract: `lib/api-spec/openapi.yaml` → `pnpm run codegen` (CI checks the output is committed).
- UI: `apps/web/src/pages/*` (MainScreen, McPage, AdminPage, SetupPage with the editor tabs and the
  onboarding wizard), `components/setup/*` (setup sections shared by both), `components/Control.tsx`
  (board/tile/soundboard pieces shared by MC and admin), `components/Pyramid.tsx`,
  `components/AdminGate.tsx` (password form) and `components/ui.tsx` (shared widgets and button
  classes). `src/lib/audio.ts` plays everything on the main screen; `lib/media.ts` resolves media
  (`resolveMedia`: upload or built-in default in `src/assets/`, made by `tools/media/` with sources in
  `public/sounds/SOURCES.md`; `mediaUrl` for built-in `sounds/…`
  paths); `lib/game.ts` holds ranking, the reveal steps and query helpers.
- Muted text uses the solid `text-ink-N` colours from `index.css` (white at N% pre-mixed), not
  `text-white/N`: translucent text darkens where Arabic glyphs overlap.
- Uploaded media are stored under `MEDIA_DIR` (Docker volume `media`) with content-hash names and
  served at `/api/media/*` with an immutable cache and a locked-down CSP.
- Run: `docker compose up --build` (needs `SESSION_SECRET` in `.env`), main screen on :8000.
  Checks: `pnpm run typecheck` (strict, tests included), `pnpm run test`, `pnpm run lint`,
  `pnpm run format:check` (`pnpm run format` fixes); docs: `pnpm --filter @kanz/docs dev|build`.

## Game rules as implemented

- Each category is an ordered list of `items`, one per tile; tile n is worth n × `pointsStep`, so
  item order = difficulty = tile value. An item is a question (`kanz: true` makes it worth
  `kanzMultiplier` × its value) or a كشكول challenge (flat `kashkoolPoints`, no answer); a category can
  hold any number of each. Tile ids are `<categoryId>-<n>`. كنز/كشكول look like normal tiles on the
  main screen until opened — the public API never exposes them. Imports with no كنز marked get one
  random كنز per category (`drawKanz`).
- Flow per tile (admin التحكم tab): open → (كنز/كشكول only) the main screen loops its celebration
  until the admin ends it. Each of the two is set to `image` (animated picture over the `kanz` /
  `kashkool` music; the default) or `video` (an uploaded video with its sound, framed over rays,
  fading to the animated picture when it ends; there is no built-in video) → show the answer as
  correct / wrong (plays `correct` / `wrong` and a green pop or red shake) or with no sound
  (questions only) → award a team or finish without points. Scores are derived from `plays` (one row per opened tile).
- Main-screen audio (`src/lib/audio.ts`): a plain question opens with `question-open`; every tile
  then loops `suspense` (after the celebration, if any) until the answer is shown or the tile closes
  (the soundboard's stop also silences it). Background music loops with fades whenever nothing else
  plays; the admin turns it on/off and sets its volume (kept in API memory like the soundboard cue).
  Soundboard clips pause the suspense loop and resume it when they end. The game's own sounds
  (`GAME_SOUNDS`) can be replaced from `/setup` (`media.sounds[name]`). The soundboard is
  `config.soundboard` (`{id, label, url}`; absent = `DEFAULT_SOUNDBOARD`); the API resolves a press
  to its url, so the main screen just plays it.
- Rounds: `config.rounds` is `[picker, opponent][]` by 1-based team number, one per tile, generated
  by `generateSchedule` (cycles where every pair meets once before rematches, play counts within one,
  no back-to-back matches when avoidable, picks balanced; best of several attempts). Empty = no
  schedule. The setup page redraws an enabled schedule when the tile or team count changes and shows
  `summarizeSchedule` warnings (idle teams, uneven counts with `evenTileCounts` suggestions). `LiveState.round` advances when a
  tile is finished (not on cancel/restore); the admin's round panel moves it by hand.
- Teams are numbered 1…n in config order; renaming from the admin's التصحيحات tab writes to the config.
- Leaderboard: the admin's view toggle shows it as-is (الترتيب) or as a reveal (كشف الترتيب).
  The reveal (`view: 'reveal'`, `revealStep` = admin presses) follows `revealSteps` in
  `src/lib/game.ts`: one press per sealed card from last place up (whoosh); each top-3 team takes
  two presses, first its full-screen spotlight with the name hidden (drumroll), then the name
  (clapping; fanfare, crown and confetti for the champion). The champion stays until one more press
  shows the final pyramid (applause).

## Changing things safely

- While plays exist, `PUT /admin/config` refuses changes to `structureKey` (category ids, each
  category's sequence of question/كنز/كشكول, team count); text, points and media are fine.
  `/setup` (`locked` in `SectionProps`) also disables adding/removing teams and reordering tiles
  then, which `structureKey` can't detect. The first save (end of onboarding) also resets the live
  state. `POST /admin/reset` clears plays,
  round and view (keeps the password). Imported categories get fresh ids for the same reason.
- Changing `LiveState`'s shape requires bumping `STATE_VERSION` in `store.ts` (new *optional* fields
  don't); old rows are then replaced (the password is kept, everything else resets).
- Changing `GameConfig` means updating `lib/game-core/src/config.ts`, the `GameConfig` schema in
  `openapi.yaml` (then codegen), `validateConfig` and the setup page together. Stored configs from
  before the change must still load: prefer optional fields, or convert them in `migrateConfig`.
- UI text is Arabic only; keep new strings Arabic and wrap team names in `<bdi>`.
