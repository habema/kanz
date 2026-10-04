# Round schedule

The schedule is optional. When it is on, **every tile is one round**: two teams compete for it and the first of them (the picker) chooses the tile. So the number of rounds always equals the number of tiles, and the number of teams decides how those rounds are shared out.

## How it is built

- **Cycles.** Matches come in cycles in which every pair of teams meets exactly once. A pair meets again only after the cycle is complete. With *n* teams a cycle has *n*(*n*−1)/2 matches.
- **More tiles than pairs:** cycles repeat, so rematches are spread evenly (any two pairs meet a number of times that differs by at most one).
- **Fewer tiles than pairs:** the game ends partway through a cycle, so not every pair meets. This doesn't affect fairness in the number of rounds.
- **Equal play.** Within a cycle, the next match is the one whose teams have played least, so play counts never differ by more than one round.
- **No back-to-back.** Nobody plays two rounds in a row when another match is available. With very few teams this is sometimes impossible; setup then says how often it happens.
- **Picks.** The pick goes to whichever of the two teams has picked less so far, so pick counts stay within one or two of each other.

The generator makes several attempts and keeps the fairest.

## When the numbers don't divide evenly

Every team plays the same number of rounds only when 2 × tiles is divisible by the number of teams:

- with an **even** number of teams *n*, the tile count must be a multiple of *n*/2;
- with an **odd** number of teams *n*, it must be a multiple of *n*.

Otherwise some teams play one round more than others. Setup says so and suggests the nearest tile counts that would even it out.

If there are **fewer tiles than half the number of teams**, some teams can't play at all. Setup warns how many will sit out.

### Examples

| teams | pairs | tiles | result |
|---|---|---|---|
| 6 | 15 | 30 | each team plays 10; each pair meets twice |
| 6 | 15 | 32 | each team plays 10–11; setup suggests 30 or 33 tiles |
| 5 | 10 | 36 | each team plays 14–15; setup suggests 35 or 40 tiles |
| 10 | 45 | 20 | each team plays 4; only 20 of 45 pairs meet |
| 10 | 45 | 4 | 4 matches cover 8 teams: 2 teams never play |

## Keeping it in step

- The schedule is **redrawn automatically** whenever the number of tiles or teams changes in setup. **سحب جديد** draws a new one by hand.
- Setup shows each team's rounds and picks, and the full list of matches.
- During the game, the round moves on when a tile is finished (not when one is cancelled or returned to the board). The admin's round panel can move it back or forward by hand.
- **بلا جدول** (no schedule) turns it off; the host then picks tiles freely.
