import { describe, expect, it } from 'vitest';
import { buildTiles, drawKanz, migrateConfig, sampleGame, validateConfig, type GameConfig } from './index';

describe('sample game', () => {
  it('is valid', () => {
    expect(validateConfig(sampleGame)).toEqual([]);
  });
});

describe('buildTiles', () => {
  it('follows the item order, with كشكول and كنز where they are listed', () => {
    const tiles = buildTiles(sampleGame).filter((t) => t.category === 'science');
    expect(tiles).toHaveLength(9);
    expect(tiles[4]).toMatchObject({ id: 'science-5', kind: 'kashkool', points: 1000, value: 500 });
    expect(tiles[7]).toMatchObject({ kind: 'question', kanz: true, value: 800, points: 1600 });
    expect(tiles[5].prompt).toBe(sampleGame.categories[0].items[5].prompt);
  });

  it('allows several of each in a category', () => {
    const config: GameConfig = {
      ...sampleGame,
      categories: [
        {
          id: 'a',
          title: 'A',
          items: [
            { kind: 'kashkool', prompt: 'K1' },
            { kind: 'question', prompt: 'Q', answer: 'A', kanz: true },
            { kind: 'kashkool', prompt: 'K2' },
            { kind: 'question', prompt: 'Q2', answer: 'A2', kanz: true },
          ],
        },
      ],
    };
    expect(validateConfig(config)).toEqual([]);
    expect(buildTiles(config).map((t) => [t.kind, t.kanz, t.points])).toEqual([
      ['kashkool', false, 1000],
      ['question', true, 400],
      ['kashkool', false, 1000],
      ['question', true, 800],
    ]);
  });
});

describe('validateConfig', () => {
  it('requires answers for questions only', () => {
    const config: GameConfig = structuredClone(sampleGame);
    config.categories[0].items[0].answer = '';
    expect(validateConfig(config)).toHaveLength(1);
  });
});

describe('migrateConfig', () => {
  it('leaves current configs alone', () => {
    expect(migrateConfig(sampleGame)).toEqual(sampleGame);
  });

  it('fills in what a partial file leaves out', () => {
    const config = migrateConfig({ teams: sampleGame.teams });
    expect(config).toMatchObject({ title: '', categories: [], rounds: [], media: {}, teams: sampleGame.teams });
    expect(() => validateConfig(config)).not.toThrow();
  });
});

describe('drawKanz', () => {
  it('marks one question in each category without a كنز', () => {
    const bare = sampleGame.categories.map((c) => ({ ...c, items: c.items.map(({ kanz, ...item }) => item) }));
    for (const category of drawKanz(bare)) {
      const marked = category.items.filter((i) => i.kanz);
      expect(marked).toHaveLength(1);
      expect(marked[0].kind).toBe('question');
    }
  });

  it('marks as many questions as asked, at most every question', () => {
    const [category] = drawKanz(
      [{ id: 'c', title: 'c', items: [q(), q(), { kind: 'kashkool', prompt: 'k' }, q()] }],
      Math.random,
      2,
    );
    expect(category.items.filter((i) => i.kanz)).toHaveLength(2);
    const [all] = drawKanz(
      [category].map((c) => ({ ...c, items: c.items.map(({ kanz, ...item }) => item) })),
      Math.random,
      9,
    );
    expect(all.items.filter((i) => i.kanz)).toHaveLength(3);
  });
});

const q = () => ({ kind: 'question' as const, prompt: 'p', answer: 'a' });

describe('validateConfig limits', () => {
  it('reports what the API would refuse', () => {
    const config: GameConfig = {
      ...sampleGame,
      categories: [
        { ...sampleGame.categories[0], items: [{ kind: 'question', prompt: 'p', answer: 'x'.repeat(501) }] },
      ],
    };
    expect(validateConfig(config)).toEqual(['إجابة الخانة 1 في «' + config.categories[0].title + '» أطول من ٥٠٠ حرف.']);
  });
});

describe('migrateConfig', () => {
  it('fills nested fields a hand-edited backup is missing', () => {
    const config = migrateConfig({ title: 't', categories: [{ id: 'x', title: 't' }, { items: [{}] }], teams: [{}] });
    expect(() => validateConfig(config)).not.toThrow();
    expect(validateConfig(config).length).toBeGreaterThan(0);
  });
});
