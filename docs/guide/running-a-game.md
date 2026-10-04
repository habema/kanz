# Running a game

## Main screen (`/`)

Show it full screen to the audience, shared or cast from the computer running the app. It is view-only: everything on it follows the admin. Browsers only allow sound after a click, so **click the main screen once** before starting. A banner asks for this if sound gets blocked. The small speaker icon in the corner switches its synthesized cues on and off.

## Admin (`/admin`)

### Control tab (التحكم)

Everything that appears on the main screen is driven from here.

1. **Open a tile:** pick it on the board. When a schedule is on, the panel above shows this round's two teams (the first picks) and the next pair.
2. **Celebration (كنز/كشكول only):** the main screen loops the celebration (picture with music, or video then picture). The question or challenge stays hidden until you press **end the celebration**.
3. **Answer (questions only):** show the answer as **correct** (sound plus a green pop), **wrong** (sound plus a red shake), or **without a sound effect**. A plain question plays a short sting when it opens; a suspense loop then runs until the answer is shown.
4. **Award:** choose the team (teams playing this round are highlighted) and award the tile's points, or **finish without points**. With a schedule, finishing a tile moves to the next round.

Opened a tile by mistake? **Close it and return it to the board** (cancel). This doesn't advance the round.

### Screen view

Between tiles, the view toggle switches the main screen between:

- **الشاشة: اللوحة**: the board.
- **الشاشة: الترتيب**: the leaderboard (a pyramid).
- **الشاشة: كشف الترتيب**: a reveal, one press at a time, from last place up:
  - each team outside the top 3: one press opens its card (whoosh);
  - each top-3 team: two presses. The first starts a full-screen spotlight with the name hidden (drumroll), the second shows the name (clapping; fanfare, crown and confetti for the champion);
  - one final press ends the champion's spotlight and shows the full pyramid (applause).

  You can step back, restart, or reveal everything at once.

### Soundboard and music

The soundboard buttons play on the main screen; they are edited under `/setup` → الأصوات. **إيقاف** (stop) silences the current clip, the celebration music and the suspense loop. Background music loops quietly whenever nothing else plays; turn it on or off and set its volume above the soundboard.

### Corrections tab (التصحيحات)

- Rename teams; the change shows on every screen.
- For any played tile, change the winning team or the points, or **return it to the board** so it can be played again. Scores are always the sum of these rows.

With a schedule, the round panel's arrows on the control tab move the current round by hand, for example after returning a tile.

## MC room (`/mc`)

A read-only view for a co-host: the board with كنز and كشكول marked, the open tile with its answer, the current match and the standings.
