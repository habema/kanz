import { shuffle } from './random';

// Who plays each round: [picker, opponent] by 1-based team number, one round
// per tile, so the number of tiles sets the number of rounds and the teams
// share them out:
//
// - Matches come in cycles in which every pair of teams meets once; a pair
//   only meets again once the cycle is complete. With more tiles than pairs,
//   the cycles repeat; with fewer, the game ends partway through one.
// - Within a cycle the next match is the one whose teams have played least,
//   so play counts never differ by more than one (and a team with fewer
//   tiles than half the teams may not play at all).
// - Nobody plays two rounds in a row when another match is available.
// - The pick goes to whichever of the two teams has picked less so far.
// The greedy pass can paint itself into a corner at the end of a cycle, so a
// few attempts are made and the fairest one is kept.
export function generateSchedule(teamCount: number, rounds: number, random = Math.random): [number, number][] {
  if (teamCount < 2 || rounds < 1) return [];
  let best: { schedule: [number, number][]; score: number[] } | undefined;
  for (let attempt = 0; attempt < 40; attempt++) {
    const schedule = attemptSchedule(teamCount, rounds, random);
    const s = summarizeSchedule(teamCount, schedule);
    const score = [s.plays[1] - s.plays[0], s.backToBack, s.meetings[1] - s.meetings[0], s.picks[1] - s.picks[0]];
    if (!best || less(score, best.score)) best = { schedule, score };
    if (score[0] <= 1 && score[1] === 0 && score[2] <= 1 && score[3] <= 1) break;
  }
  return best!.schedule;
}

function attemptSchedule(teamCount: number, rounds: number, random: () => number): [number, number][] {
  const teams = Array.from({ length: teamCount }, (_, i) => i + 1);
  const plays = new Array(teamCount + 1).fill(0);
  const matches: [number, number][] = [];
  let cycle: [number, number][] = [];
  while (matches.length < rounds) {
    if (cycle.length === 0)
      cycle = shuffle(
        teams.flatMap((a) => teams.filter((b) => b > a).map((b): [number, number] => [a, b])),
        random,
      );
    const last = matches[matches.length - 1] ?? [];
    const cost = ([a, b]: [number, number]) => [
      last.includes(a) || last.includes(b) ? 1 : 0,
      Math.max(plays[a], plays[b]),
      plays[a] + plays[b],
    ];
    let best = 0;
    for (let i = 1; i < cycle.length; i++) if (less(cost(cycle[i]), cost(cycle[best]))) best = i;
    const [match] = cycle.splice(best, 1);
    plays[match[0]]++;
    plays[match[1]]++;
    matches.push(match);
  }

  const picks = new Map<number, number>();
  return matches.map(([a, b]) => {
    const pa = picks.get(a) ?? 0;
    const pb = picks.get(b) ?? 0;
    const picker = pa < pb || (pa === pb && random() < 0.5) ? a : b;
    picks.set(picker, (picks.get(picker) ?? 0) + 1);
    return picker === a ? [a, b] : [b, a];
  });
}

const less = (x: number[], y: number[]) => {
  for (let i = 0; i < x.length; i++) if (x[i] !== y[i]) return x[i] < y[i];
  return false;
};

export type ScheduleSummary = {
  rounds: number;
  pairs: number;
  // Rounds each team plays and picks, lowest and highest.
  plays: [number, number];
  picks: [number, number];
  // Times each pair meets, lowest and highest, and how many pairs meet at all.
  meetings: [number, number];
  met: number;
  // Teams that never play.
  idle: number;
  backToBack: number;
};

export function summarizeSchedule(teamCount: number, rounds: [number, number][]): ScheduleSummary {
  const plays = new Array(teamCount).fill(0);
  const picks = new Array(teamCount).fill(0);
  const meetings = new Map<string, number>();
  for (let a = 1; a <= teamCount; a++) for (let b = a + 1; b <= teamCount; b++) meetings.set(`${a}-${b}`, 0);
  let backToBack = 0;
  rounds.forEach(([picker, opponent], i) => {
    plays[picker - 1]++;
    plays[opponent - 1]++;
    picks[picker - 1]++;
    const key = `${Math.min(picker, opponent)}-${Math.max(picker, opponent)}`;
    meetings.set(key, (meetings.get(key) ?? 0) + 1);
    if (i > 0 && rounds[i - 1].some((t) => t === picker || t === opponent)) backToBack++;
  });
  const range = (values: number[]): [number, number] =>
    values.length ? [Math.min(...values), Math.max(...values)] : [0, 0];
  return {
    rounds: rounds.length,
    pairs: meetings.size,
    plays: range(plays),
    picks: range(picks),
    meetings: range([...meetings.values()]),
    met: [...meetings.values()].filter((m) => m > 0).length,
    idle: plays.filter((p) => p === 0).length,
    backToBack,
  };
}

// Tile counts near `tiles` at which every team plays the same number of
// rounds (2 × tiles divisible by the number of teams).
export function evenTileCounts(teamCount: number, tiles: number): number[] {
  if (teamCount < 2) return [];
  const step = teamCount % 2 ? teamCount : teamCount / 2;
  const below = Math.floor(tiles / step) * step;
  return [below, below + step].filter((t) => t > 0 && t !== tiles);
}
