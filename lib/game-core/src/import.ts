import type { Category, GameConfig, Item } from './config';

// Questions as a table, one row per tile, in board order:
//
//   الفئة    | النوع  | النص                          | الإجابة
//   علوم     | سؤال   | ما الكوكب الملقب بالكوكب الأحمر؟ | المريخ
//   علوم     | كنز    | ما الرمز الكيميائي للذهب؟        | Au
//   علوم     | كشكول  | تحدي الأكواب: ابنِ هرماً…         |
//
// The type is سؤال (or empty), كنز (a question worth more) or كشكول (a
// challenge). Headers may be Arabic or English (category, type, text,
// answer). Without a category column, each sheet is one category named after
// the sheet. The header row needs the text column and one other known column;
// other columns are ignored. Sheets without a header row are skipped.
export type Sheet = { name: string; rows: unknown[][] };

const HEADERS: [RegExp, 'category' | 'type' | 'text' | 'answer'][] = [
  [/^(category|الفئة|فئة|القسم)$/i, 'category'],
  [/^(type|kind|النوع|نوع)$/i, 'type'],
  [/^(text|question|prompt|النص|نص|السؤال|سؤال|السؤال \/ التحدي)$/i, 'text'],
  [/^(answer|الإجابة|الاجابة|إجابة|اجابة|الجواب|جواب)$/i, 'answer'],
];
const KASHKOOL = /^(kashkool|challenge|كشكول|الكشكول|تحدي|التحدي)$/i;
const KANZ = /^(kanz|treasure|كنز|الكنز)$/i;

const text = (cell: unknown) => (cell === null || cell === undefined ? '' : String(cell).trim());

// Leading emoji (and the space after them) are dropped from questions.
const cleanPrompt = (value: string) =>
  value
    .replace(
      /^(?:\p{Extended_Pictographic}|\p{Regional_Indicator}|\p{Emoji_Modifier}|\u{FE0F}|\u{200D}|\u{20E3})+\s*/u,
      '',
    )
    .trim();
// "الجواب: الكبد." → "الكبد"
const cleanAnswer = (value: string) =>
  cleanPrompt(value)
    .replace(/^(الجواب|الإجابة|الاجابة|answer)\s*[:：]\s*/i, '')
    .replace(/[.。]+$/, '')
    .trim();

export function parseSheets(sheets: Sheet[]): Category[] {
  const byTitle = new Map<string, Item[]>();
  const add = (title: string, item: Item) => {
    if (!byTitle.has(title)) byTitle.set(title, []);
    byTitle.get(title)!.push(item);
  };
  for (const sheet of sheets) {
    const rows = sheet.rows.map((row) => row.map(text));
    const header = (cell: string) => HEADERS.find(([re]) => re.test(cell))?.[1];
    const isHeader = (row: string[]) =>
      new Set(row.map(header).filter(Boolean)).size >= 2 && row.some((cell) => header(cell) === 'text');
    const at = rows.findIndex(isHeader);
    if (at === -1) continue;
    const col: Partial<Record<'category' | 'type' | 'text' | 'answer', number>> = {};
    rows[at].forEach((cell, i) => {
      const key = header(cell);
      if (key && col[key] === undefined) col[key] = i;
    });
    let lastTitle = sheet.name.trim();
    for (const row of rows.slice(at + 1)) {
      if (col.category !== undefined && row[col.category]) lastTitle = row[col.category];
      const prompt = cleanPrompt(row[col.text!] ?? '');
      if (!prompt) continue;
      const type = col.type === undefined ? '' : (row[col.type] ?? '');
      if (KASHKOOL.test(type)) add(lastTitle, { kind: 'kashkool', prompt });
      else
        add(lastTitle, {
          kind: 'question',
          prompt,
          answer: col.answer === undefined ? '' : cleanAnswer(row[col.answer] ?? ''),
          ...(KANZ.test(type) ? { kanz: true } : {}),
        });
    }
  }
  return [...byTitle]
    .filter(([, items]) => items.length)
    .map(([title, items], i) => ({ id: `c${i + 1}`, title, items }));
}

// The same table as CSV.
export function parseCsv(source: string): Category[] {
  return parseSheets([{ name: '', rows: csvRows(source.replace(/^\uFEFF/, '')) }]);
}

// The game's questions in the import layout, header first, for export.
export function questionRows(config: Pick<GameConfig, 'categories'>): string[][] {
  const rows = [['الفئة', 'النوع', 'النص', 'الإجابة']];
  for (const c of config.categories)
    for (const item of c.items)
      rows.push([
        c.title,
        item.kind === 'kashkool' ? 'كشكول' : item.kanz ? 'كنز' : 'سؤال',
        item.prompt,
        item.kind === 'kashkool' ? '' : (item.answer ?? ''),
      ]);
  return rows;
}

function csvRows(source: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < source.length; i++) {
    const ch = source[i];
    if (quoted) {
      if (ch === '"' && source[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') {
      row.push(cell);
      cell = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && source[i + 1] === '\n') i++;
      row.push(cell);
      cell = '';
      if (row.some(Boolean)) rows.push(row);
      row = [];
    } else cell += ch;
  }
  row.push(cell);
  if (row.some(Boolean)) rows.push(row);
  return rows;
}
