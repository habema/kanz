import { useEffect, useState } from 'react';
import {
  drawKanz,
  parseCsv,
  parseSheets,
  questionRows,
  sampleGame,
  type Category,
  type GameConfig,
  type Item,
} from '@kanz/game-core';
import {
  ArrowDown,
  ArrowUp,
  Dices,
  Download,
  FileUp,
  Gem,
  GripVertical,
  Minus,
  PartyPopper,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import { ErrorLine, input, outlineButton } from '@/components/ui';
import { number } from '@/lib/game';
import { FilePick, IconButton, NumberField, newId, useRowKeys, type SectionProps } from './shared';

const newCategory = (title = 'فئة جديدة'): Category => ({
  id: newId('c'),
  title,
  items: [{ kind: 'question', prompt: '', answer: '' }],
});

export function QuestionsSection({ draft, update, locked }: SectionProps) {
  const [notice, setNotice] = useState<string | null>(null);
  const [failed, setFailed] = useState<string | null>(null);
  const setCategory = (index: number, category: Category) =>
    update({ categories: draft.categories.map((c, i) => (i === index ? category : c)) });
  const move = (index: number, by: number) => {
    const list = [...draft.categories];
    const [item] = list.splice(index, 1);
    list.splice(index + by, 0, item);
    update({ categories: list });
  };
  const importFile = async (file: File) => {
    setNotice(null);
    setFailed(null);
    try {
      const imported = await readQuestions(file);
      if (imported.length === 0) {
        setFailed('لم يُعثر على أسئلة في الملف. نزّل ملف Excel لترى التنسيق.');
        return;
      }
      if (!window.confirm(`استبدال الفئات الحالية بـ${number(imported.length)} فئات من الملف؟`)) return;
      // Fresh ids so a running game never mistakes them for the old tiles.
      const fresh = imported.map((c) => ({ ...c, id: newId('c') }));
      const marked = fresh.some((c) => c.items.some((i) => i.kanz));
      const categories = marked ? fresh : drawKanz(fresh);
      update({ categories });
      const tiles = categories.reduce((sum, c) => sum + c.items.length, 0);
      setNotice(
        `استُوردت ${number(categories.length)} فئات و${number(tiles)} خانة${marked ? '' : '، مع كنز عشوائي في كل فئة'}.`,
      );
    } catch (error) {
      setFailed(`تعذّرت قراءة الملف: ${error instanceof Error ? error.message : String(error)}`);
    }
  };
  // With nothing written yet, the download is the sample, as a template.
  const written = draft.categories.some((c) => c.items.some((i) => i.prompt.trim()));
  return (
    <div className="grid gap-6">
      <section className="panel-bevel flex flex-wrap items-center justify-between gap-4 p-5">
        <div className="min-w-0 max-w-xl">
          <h2 className="text-lg font-black">Excel</h2>
          <p className="mt-1 text-xs leading-6 text-ink-50">
            نزّل الأسئلة كملف Excel، عدّلها، ثم استوردها مكان الفئات الحالية.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void downloadQuestions(written ? draft : sampleGame, 'questions.xlsx')}
            className={outlineButton}
          >
            <Download size={14} /> تنزيل ملف Excel
          </button>
          <FilePick accept=".xlsx,.csv" onFile={importFile} testId="input-import">
            <FileUp size={14} /> استيراد من Excel
          </FilePick>
        </div>
        {notice && (
          <p className="w-full border border-[#53cec4]/50 bg-[#53cec4]/10 px-4 py-3 text-sm text-[#82e6de]">{notice}</p>
        )}
        {failed && (
          <div className="w-full">
            <ErrorLine text={failed} />
          </div>
        )}
      </section>

      {draft.categories.map((category, index) => (
        <CategoryEditor
          key={category.id}
          category={category}
          config={draft}
          index={index}
          onChange={(c) => setCategory(index, c)}
          locked={locked}
          onMove={(by) => move(index, by)}
          onRemove={() => {
            if (window.confirm(`حذف فئة «${category.title}» وكل خاناتها؟`))
              update({ categories: draft.categories.filter((_, i) => i !== index) });
          }}
        />
      ))}
      <button
        type="button"
        onClick={() => update({ categories: [...draft.categories, newCategory()] })}
        className="flex items-center justify-center gap-2 border border-dashed border-white/25 px-4 py-4 text-sm font-bold text-ink-60 hover:border-white/50 hover:text-white"
        data-testid="button-add-category"
      >
        <Plus size={16} /> إضافة فئة
      </button>
    </div>
  );
}

// One category: its tiles in board order. Rows are reordered with the arrows
// or by dragging the handle; a كشكول is just another row.
function CategoryEditor({
  category,
  config,
  index,
  locked,
  onChange,
  onMove,
  onRemove,
}: {
  category: Category;
  config: GameConfig;
  index: number;
  locked?: boolean;
  onChange: (c: Category) => void;
  onMove: (by: number) => void;
  onRemove: () => void;
}) {
  const items = category.items;
  const [armed, setArmed] = useState<number | null>(null);
  const [dragging, setDragging] = useState<number | null>(null);
  const rows = useRowKeys(items.length);
  const setItems = (list: Item[]) => onChange({ ...category, items: list });
  const setItem = (i: number, patch: Partial<Item>) =>
    setItems(items.map((item, j) => (j === i ? { ...item, ...patch } : item)));
  const moveItem = (from: number, to: number) => {
    if (to < 0 || to >= items.length || from === to) return;
    const list = [...items];
    const [item] = list.splice(from, 1);
    list.splice(to, 0, item);
    rows.move(from, to);
    setItems(list);
  };
  const removeItem = (i: number) => {
    rows.remove(i);
    setItems(items.filter((_, j) => j !== i));
  };
  const add = (kind: Item['kind']) => {
    rows.add();
    setItems([...items, kind === 'kashkool' ? { kind, prompt: '' } : { kind, prompt: '', answer: '' }]);
  };
  const kashkools = items.filter((i) => i.kind === 'kashkool').length;
  const questions = items.length - kashkools;
  const kanz = items.filter((i) => i.kanz).length;
  // How many كنز the dice draw (0 clears them); follows the gems marked above.
  const [kanzCount, setKanzCount] = useState(kanz);
  useEffect(() => setKanzCount(kanz), [kanz]);
  const draw = Math.min(kanzCount, questions);
  const randomKanz = () =>
    setItems(drawKanz([{ ...category, items: items.map(({ kanz, ...item }) => item) }], Math.random, draw)[0].items);
  return (
    <section className="panel-bevel p-5" data-testid={`category-${index}`}>
      <div className="flex flex-wrap items-center gap-3">
        <input
          value={category.title}
          onChange={(e) => onChange({ ...category, title: e.target.value })}
          maxLength={60}
          placeholder="اسم الفئة"
          aria-label="اسم الفئة"
          className={`${input} min-w-0 flex-1 text-base font-black`}
        />
        <span className="text-xs text-ink-45">
          {number(items.length)} خانة{kashkools ? ` · ${number(kashkools)} كشكول` : ''}
          {kanz ? ` · ${number(kanz)} كنز` : ''}
        </span>
        <div className="flex gap-1">
          <IconButton title="تحريك الفئة قبل" disabled={locked || index === 0} onClick={() => onMove(-1)}>
            <ArrowUp size={14} />
          </IconButton>
          <IconButton
            title="تحريك الفئة بعد"
            disabled={locked || index === config.categories.length - 1}
            onClick={() => onMove(1)}
          >
            <ArrowDown size={14} />
          </IconButton>
          <IconButton title="حذف الفئة" onClick={onRemove}>
            <Trash2 size={14} />
          </IconButton>
        </div>
      </div>

      <div className="mt-4 grid gap-2">
        {items.map((item, i) => {
          const value = (i + 1) * config.pointsStep;
          const kashkool = item.kind === 'kashkool';
          const tone = kashkool
            ? 'border-[#ff7aa8]/60 bg-[#ff7aa8]/[.06]'
            : item.kanz
              ? 'border-[#f2c75d]/70 bg-[#f2c75d]/[.06]'
              : 'border-white/10 bg-black/10';
          return (
            <div
              key={rows.keys[i]}
              draggable={armed === i}
              onDragStart={(e) => {
                e.dataTransfer.effectAllowed = 'move';
                setDragging(i);
              }}
              onDragOver={(e) => {
                if (dragging === null) return;
                e.preventDefault();
                if (dragging !== i) {
                  moveItem(dragging, i);
                  setDragging(i);
                }
              }}
              onDragEnd={() => {
                setDragging(null);
                setArmed(null);
              }}
              data-testid={`item-${index}-${i}`}
              className={`grid items-start gap-2 border p-2 sm:grid-cols-[auto_6.5rem_minmax(0,1fr)_auto] ${tone} ${dragging === i ? 'opacity-50' : ''}`}
            >
              <span
                title="اسحب لتغيير الترتيب"
                onPointerDown={() => !locked && setArmed(i)}
                onPointerUp={() => setArmed(null)}
                className="hidden cursor-grab place-items-center self-stretch text-ink-30 hover:text-ink-70 sm:grid"
              >
                <GripVertical size={16} />
              </span>
              <span className="flex flex-col pt-1.5 text-xs tabular-nums">
                {kashkool ? (
                  <>
                    <span className="flex items-center gap-1 font-black text-[#ff9dbd]">
                      <PartyPopper size={12} /> كشكول
                    </span>
                    <span
                      className="whitespace-nowrap text-ink-40"
                      title={`تظهر على اللوحة ${number(value)} وتُحتسب ${number(config.kashkoolPoints)}`}
                    >
                      {number(value)} ← {number(config.kashkoolPoints)}
                    </span>
                  </>
                ) : item.kanz ? (
                  <>
                    <span className="flex items-center gap-1 font-black text-[#f2c75d]">
                      <Gem size={12} /> كنز
                    </span>
                    <span
                      className="whitespace-nowrap text-ink-40"
                      title={`تظهر على اللوحة ${number(value)} وتُحتسب ${number(Math.round(value * config.kanzMultiplier))}`}
                    >
                      {number(value)} ← {number(Math.round(value * config.kanzMultiplier))}
                    </span>
                  </>
                ) : (
                  <>
                    <span className="text-ink-45">سؤال</span>
                    <span className="text-ink-60">{number(value)} نقطة</span>
                  </>
                )}
              </span>
              {kashkool ? (
                <textarea
                  value={item.prompt}
                  onChange={(e) => setItem(i, { prompt: e.target.value })}
                  rows={2}
                  placeholder="عنوان التحدي: وصفه (ما قبل النقطتين يظهر عنواناً)"
                  aria-label={`نص الكشكول ${i + 1}`}
                  className={`${input} min-h-[2.4rem] resize-y`}
                />
              ) : (
                <div className="grid gap-2 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
                  <textarea
                    value={item.prompt}
                    onChange={(e) => setItem(i, { prompt: e.target.value })}
                    rows={1}
                    placeholder="السؤال"
                    aria-label={`السؤال ${i + 1}`}
                    className={`${input} min-h-[2.4rem] resize-y`}
                  />
                  <input
                    value={item.answer ?? ''}
                    onChange={(e) => setItem(i, { answer: e.target.value })}
                    placeholder="الإجابة"
                    aria-label={`إجابة السؤال ${i + 1}`}
                    className={input}
                  />
                </div>
              )}
              <div className="flex gap-1">
                {!kashkool && (
                  <IconButton
                    title={item.kanz ? 'إلغاء الكنز' : 'اجعله كنزاً (نقاط مضاعفة)'}
                    active={!!item.kanz}
                    onClick={() => setItem(i, { kanz: item.kanz ? undefined : true })}
                  >
                    <Gem size={14} />
                  </IconButton>
                )}
                <IconButton title="أسهل (قبل)" disabled={locked || i === 0} onClick={() => moveItem(i, i - 1)}>
                  <ArrowUp size={14} />
                </IconButton>
                <IconButton
                  title="أصعب (بعد)"
                  disabled={locked || i === items.length - 1}
                  onClick={() => moveItem(i, i + 1)}
                >
                  <ArrowDown size={14} />
                </IconButton>
                <IconButton title="حذف الخانة" onClick={() => removeItem(i)}>
                  <X size={14} />
                </IconButton>
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => add('question')}
          data-testid={`button-add-question-${index}`}
          className={outlineButton}
        >
          <Plus size={14} /> سؤال
        </button>
        <button
          type="button"
          onClick={() => add('kashkool')}
          data-testid={`button-add-kashkool-${index}`}
          className={`${outlineButton} border-[#ff7aa8]/40 text-[#ff9dbd]`}
        >
          <PartyPopper size={14} /> كشكول
        </button>
        <div className="mr-auto flex items-center border border-white/15" role="group" aria-label="كنز عشوائي">
          <button
            type="button"
            disabled={draw <= 0}
            onClick={() => setKanzCount(draw - 1)}
            aria-label="كنز أقل"
            className="grid h-9 w-8 place-items-center text-ink-60 hover:text-white disabled:opacity-25"
          >
            <Minus size={12} />
          </button>
          <span
            className="w-6 text-center text-xs font-black tabular-nums text-[#f2c75d]"
            aria-live="polite"
            data-testid={`kanz-count-${index}`}
          >
            {number(draw)}
          </span>
          <button
            type="button"
            disabled={draw >= questions}
            onClick={() => setKanzCount(draw + 1)}
            aria-label="كنز أكثر"
            className="grid h-9 w-8 place-items-center text-ink-60 hover:text-white disabled:opacity-25"
          >
            <Plus size={12} />
          </button>
          <button
            type="button"
            disabled={questions === 0}
            onClick={randomKanz}
            title={draw ? 'يختار هذا العدد من الأسئلة كنزاً عشوائياً بدل الحالي' : 'يلغي كل كنز في هذه الفئة'}
            data-testid={`button-random-kanz-${index}`}
            className="flex h-9 items-center gap-2 border-r border-white/15 px-3 text-xs font-bold text-ink-70 hover:text-white disabled:opacity-30"
          >
            <Dices size={14} /> كنز عشوائي
          </button>
        </div>
      </div>
    </section>
  );
}

async function readQuestions(file: File): Promise<Category[]> {
  if (file.name.toLowerCase().endsWith('.csv')) return parseCsv(await file.text());
  // The Excel libraries are large, so they load on first use.
  const { default: readExcelFile } = await import('read-excel-file/browser');
  const sheets = await readExcelFile(file);
  return parseSheets(sheets.map((s) => ({ name: s.sheet, rows: s.data })));
}

async function downloadQuestions(config: Pick<GameConfig, 'categories'>, fileName: string) {
  const { default: writeXlsxFile } = await import('write-excel-file/browser');
  const [header, ...rows] = questionRows(config);
  await writeXlsxFile(
    [
      header.map((value) => ({ value, fontWeight: 'bold' as const, backgroundColor: '#f2c75d' })),
      ...rows.map((row) => row.map((value) => ({ value, wrap: true }))),
    ],
    {
      sheet: 'الأسئلة',
      rightToLeft: true,
      stickyRowsCount: 1,
      columns: [{ width: 16 }, { width: 9 }, { width: 70 }, { width: 28 }],
    },
  ).toFile(fileName);
}

export function PointsSection({ draft, update }: SectionProps) {
  return (
    <section className="panel-bevel grid gap-4 p-5 sm:grid-cols-3">
      <h2 className="text-lg font-black sm:col-span-3">النقاط</h2>
      <NumberField
        label="قيمة الخانة الأولى (والزيادة لكل خانة)"
        value={draft.pointsStep}
        min={1}
        onChange={(pointsStep) => update({ pointsStep })}
      />
      <NumberField
        label="نقاط الكشكول"
        value={draft.kashkoolPoints}
        min={0}
        onChange={(kashkoolPoints) => update({ kashkoolPoints })}
      />
      <NumberField
        label="مضاعف الكنز"
        value={draft.kanzMultiplier}
        min={1}
        step={0.5}
        onChange={(kanzMultiplier) => update({ kanzMultiplier })}
      />
    </section>
  );
}
