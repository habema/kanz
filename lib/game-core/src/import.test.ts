import { describe, expect, it } from 'vitest';
import { parseCsv, parseSheets, questionRows } from './import';
import { sampleGame } from './sample';

describe('parseSheets', () => {
  it('reads the table layout with a category column', () => {
    const categories = parseSheets([
      {
        name: 'Sheet1',
        rows: [
          ['الفئة', 'النوع', 'النص', 'الإجابة'],
          ['علوم', 'سؤال', 'ما الكوكب الأحمر؟', 'المريخ'],
          ['علوم', 'كشكول', 'تحدي الأكواب: ابنِ هرماً', null],
          [null, 'كنز', 'ما رمز الذهب؟', 'Au'],
          ['جغرافيا', '', '🇯🇵 ما عاصمة اليابان؟', 'الجواب: طوكيو.'],
        ],
      },
    ]);
    expect(categories).toEqual([
      {
        id: 'c1',
        title: 'علوم',
        items: [
          { kind: 'question', prompt: 'ما الكوكب الأحمر؟', answer: 'المريخ' },
          { kind: 'kashkool', prompt: 'تحدي الأكواب: ابنِ هرماً' },
          { kind: 'question', prompt: 'ما رمز الذهب؟', answer: 'Au', kanz: true },
        ],
      },
      { id: 'c2', title: 'جغرافيا', items: [{ kind: 'question', prompt: 'ما عاصمة اليابان؟', answer: 'طوكيو' }] },
    ]);
  });

  it('names categories after sheets when there is no category column', () => {
    const categories = parseSheets([
      {
        name: 'Science',
        rows: [
          ['type', 'question', 'answer'],
          ['', '3 + 3?', '6'],
          ['challenge', 'Dance', ''],
        ],
      },
      { name: 'Notes', rows: [['just text']] },
    ]);
    expect(categories).toEqual([
      {
        id: 'c1',
        title: 'Science',
        items: [
          { kind: 'question', prompt: '3 + 3?', answer: '6' },
          { kind: 'kashkool', prompt: 'Dance' },
        ],
      },
    ]);
  });

  it('ignores extra columns', () => {
    const categories = parseSheets([
      {
        name: 'Science',
        rows: [
          ['#', 'question', 'notes', 'answer'],
          ['1', '3 + 3?', 'easy', '6'],
        ],
      },
    ]);
    expect(categories).toEqual([
      { id: 'c1', title: 'Science', items: [{ kind: 'question', prompt: '3 + 3?', answer: '6' }] },
    ]);
  });

  it('takes the category from a row with no question', () => {
    const categories = parseSheets([
      {
        name: '',
        rows: [
          ['الفئة', 'النص', 'الإجابة'],
          ['علوم', '', ''],
          ['', 'س١', 'ج١'],
        ],
      },
    ]);
    expect(categories).toEqual([
      { id: 'c1', title: 'علوم', items: [{ kind: 'question', prompt: 'س١', answer: 'ج١' }] },
    ]);
  });
});

describe('csv', () => {
  it("round-trips the game's questions", () => {
    const cell = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
    const csv = questionRows(sampleGame)
      .map((row) => row.map(cell).join(','))
      .join('\n');
    const categories = parseCsv(csv);
    expect(categories.map((c) => c.title)).toEqual(sampleGame.categories.map((c) => c.title));
    expect(categories.map((c) => c.items)).toEqual(sampleGame.categories.map((c) => c.items));
  });

  it('handles quoted cells', () => {
    const [category] = parseCsv('category,type,text,answer\nA,question,"Q1, ""quoted""",1\n');
    expect(category.items).toEqual([{ kind: 'question', prompt: 'Q1, "quoted"', answer: '1' }]);
  });
});
