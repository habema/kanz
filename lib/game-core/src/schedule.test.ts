import { describe, expect, it } from 'vitest';
import { seeded } from './random';
import { evenTileCounts, generateSchedule, summarizeSchedule } from './schedule';

const key = ([a, b]: [number, number]) => `${Math.min(a, b)}-${Math.max(a, b)}`;

describe('generateSchedule', () => {
  for (const teams of [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 16]) {
    for (const extra of [-5, 0, 3, 17, -1000, 7 - teams * (teams - 1), 30 - teams * (teams - 1)]) {
      const pairs = (teams * (teams - 1)) / 2;
      const rounds = Math.max(1, pairs * 2 + extra);
      it(`is fair for ${teams} teams over ${rounds} rounds`, () => {
        for (let seed = 1; seed <= 20; seed++) {
          const schedule = generateSchedule(teams, rounds, seeded(seed * 31 + teams));
          expect(schedule).toHaveLength(rounds);
          for (const [a, b] of schedule) {
            expect(a).not.toBe(b);
            expect(Math.min(a, b)).toBeGreaterThanOrEqual(1);
            expect(Math.max(a, b)).toBeLessThanOrEqual(teams);
          }
          // Everyone meets everyone once before any rematch.
          expect(new Set(schedule.slice(0, pairs).map(key)).size).toBe(Math.min(pairs, rounds));
          const summary = summarizeSchedule(teams, schedule);
          expect(summary.plays[1] - summary.plays[0]).toBeLessThanOrEqual(1);
          expect(summary.picks[1] - summary.picks[0]).toBeLessThanOrEqual(2);
          expect(summary.meetings[1] - summary.meetings[0]).toBeLessThanOrEqual(1);
          if (teams >= 5) expect(summary.backToBack).toBe(0);
        }
      });
    }
  }

  it('leaves teams out when there are too few tiles', () => {
    const summary = summarizeSchedule(10, generateSchedule(10, 3, seeded(1)));
    expect(summary.idle).toBe(4);
  });

  it('returns nothing without two teams', () => {
    expect(generateSchedule(1, 10)).toEqual([]);
  });
});

describe('evenTileCounts', () => {
  it('suggests counts that share rounds evenly', () => {
    expect(evenTileCounts(6, 32)).toEqual([30, 33]);
    expect(evenTileCounts(5, 32)).toEqual([30, 35]);
    expect(evenTileCounts(6, 30)).toEqual([33]);
  });
});
