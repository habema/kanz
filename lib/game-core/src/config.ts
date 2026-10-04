import { shuffle } from './random';

// The game a host sets up on /setup: branding, questions, teams, rounds and
// media. The server stores one of these and builds the board from it.
//
// Each category is a column of tiles worth pointsStep, 2×pointsStep, … in
// item order (order = difficulty = value). An item is a question, possibly
// marked كنز (worth kanzMultiplier × its value), or a كشكول (a challenge
// worth a flat kashkoolPoints). A category may hold any number of each; the
// host places them by ordering the list.

export type ItemKind = 'question' | 'kashkool';
export type Item = { kind: ItemKind; prompt: string; answer?: string; kanz?: boolean };

export type Category = { id: string; title: string; items: Item[] };

export type Team = { name: string; color: string };

// How a كنز or كشكول opens on the main screen: its picture with music, or its
// video (with its own sound) and then the picture.
export type CelebrationMode = 'image' | 'video';

// URLs of uploaded files; anything absent uses the built-in default.
export type Media = {
  logo?: string;
  kanzImage?: string;
  kanzVideo?: string;
  kanzMode?: CelebrationMode;
  kashkoolImage?: string;
  kashkoolVideo?: string;
  kashkoolMode?: CelebrationMode;
  music?: string;
  // Replacements for the game's own sounds, by name (see GAME_SOUNDS).
  sounds?: Record<string, string>;
};

// A soundboard button. url is an upload (/api/media/…) or a built-in file
// (sounds/<name>.mp3, relative to the site).
export type SoundboardEntry = { id: string; label: string; url: string };

export type GameConfig = {
  title: string;
  subtitle?: string;
  pointsStep: number;
  kashkoolPoints: number;
  kanzMultiplier: number;
  categories: Category[];
  teams: Team[];
  // [picker, opponent] by 1-based team number; one round per tile. Empty
  // means no schedule: the host just picks tiles.
  rounds: [number, number][];
  media: Media;
  // Absent means the built-in DEFAULT_SOUNDBOARD.
  soundboard?: SoundboardEntry[];
};

// Sounds the game plays by itself; each can be replaced from /setup.
export const GAME_SOUNDS = [
  { name: 'question-open', label: 'فتح سؤال' },
  { name: 'suspense', label: 'تشويق (يتكرر حتى ظهور الإجابة)' },
  { name: 'kanz', label: 'موسيقى احتفال الكنز (في وضع الصورة)' },
  { name: 'kashkool', label: 'موسيقى احتفال الكشكول (في وضع الصورة)' },
  { name: 'correct', label: 'إجابة صحيحة' },
  { name: 'wrong', label: 'إجابة خاطئة' },
  { name: 'whoosh', label: 'كشف الترتيب: كل بطاقة' },
  { name: 'drumroll', label: 'كشف الترتيب: قبل اسم المراكز الأولى' },
  { name: 'clapping', label: 'كشف الترتيب: المركزان الثاني والثالث' },
  { name: 'fanfare', label: 'كشف الترتيب: البطل' },
  { name: 'applause', label: 'كشف الترتيب: الختام' },
] as const;
export type GameSound = (typeof GAME_SOUNDS)[number]['name'];
// Built-in file for each game sound (the كشكول shares the كنز music).
export const builtinSound = (name: GameSound) => `sounds/${name === 'kashkool' ? 'kanz' : name}.mp3`;

export const DEFAULT_SOUNDBOARD: SoundboardEntry[] = [
  { id: 'correct', label: 'صح', url: 'sounds/correct.mp3' },
  { id: 'wrong', label: 'خطأ', url: 'sounds/wrong.mp3' },
  { id: 'applause', label: 'تصفيق', url: 'sounds/applause.mp3' },
  { id: 'laugh', label: 'ضحك', url: 'sounds/laugh.mp3' },
  { id: 'drumroll', label: 'طبول', url: 'sounds/drumroll.mp3' },
  { id: 'countdown', label: 'عدّ تنازلي ١٠ث', url: 'sounds/countdown.mp3' },
  { id: 'times-up', label: 'انتهى الوقت', url: 'sounds/times-up.mp3' },
  { id: 'sad-trombone', label: 'ترومبون حزين', url: 'sounds/sad-trombone.mp3' },
];
export const soundboardOf = (config: GameConfig) => config.soundboard ?? DEFAULT_SOUNDBOARD;

export type Tile = {
  id: string;
  category: string;
  title: string;
  kind: ItemKind;
  kanz: boolean;
  value: number;
  points: number;
  prompt: string;
  answer?: string;
};

export const totalTiles = (config: Pick<GameConfig, 'categories'>) =>
  config.categories.reduce((sum, c) => sum + c.items.length, 0);

export function buildTiles(config: GameConfig): Tile[] {
  return config.categories.flatMap((category) =>
    category.items.map((item, index): Tile => {
      const tile = index + 1;
      const value = tile * config.pointsStep;
      const base = {
        id: `${category.id}-${tile}`,
        category: category.id,
        title: category.title,
        value,
        prompt: item.prompt,
      };
      if (item.kind === 'kashkool') return { ...base, kind: 'kashkool', kanz: false, points: config.kashkoolPoints };
      const kanz = !!item.kanz;
      return {
        ...base,
        kind: 'question',
        kanz,
        points: kanz ? Math.round(value * config.kanzMultiplier) : value,
        answer: item.answer ?? '',
      };
    }),
  );
}

const HEX = /^#[0-9a-f]{6}$/i;

// Problems that would stop the game from running, in Arabic for the setup page.
export function validateConfig(config: GameConfig): string[] {
  const errors: string[] = [];
  if (!config.title.trim()) errors.push('اسم المسابقة مطلوب.');
  // The same limits as the API schema (openapi.yaml), so a save never fails on them.
  if (config.title.length > 80 || (config.subtitle?.length ?? 0) > 80)
    errors.push('اسم المسابقة والسطر الفرعي حتى ٨٠ حرفاً.');
  if (config.categories.length > 12) errors.push('الحد الأقصى ١٢ فئة.');
  if (config.teams.length > 40) errors.push('الحد الأقصى ٤٠ فريقاً.');
  if ((config.soundboard?.length ?? 0) > 60) errors.push('الحد الأقصى ٦٠ زراً في لوحة المؤثرات.');
  if (!(config.pointsStep > 0)) errors.push('قيمة الخانة يجب أن تكون أكبر من صفر.');
  if (!(config.kashkoolPoints >= 0)) errors.push('نقاط الكشكول لا يمكن أن تكون سالبة.');
  if (!(config.kanzMultiplier >= 1)) errors.push('مضاعف الكنز يجب أن يكون ١ أو أكثر.');
  if (config.categories.length === 0) errors.push('أضف فئة واحدة على الأقل.');
  const ids = new Set<string>();
  for (const category of config.categories) {
    const name = `«${category.title || category.id}»`;
    if (!category.id || ids.has(category.id)) errors.push(`معرّف الفئة ${name} مكرر أو فارغ.`);
    ids.add(category.id);
    if (!category.title.trim()) errors.push(`فئة بلا اسم (${category.id}).`);
    if (category.title.length > 60) errors.push(`اسم الفئة ${name} أطول من ٦٠ حرفاً.`);
    if (category.items.length === 0) errors.push(`الفئة ${name} بلا خانات.`);
    if (category.items.length > 40) errors.push(`الفئة ${name} فيها أكثر من ٤٠ خانة.`);
    category.items.forEach((item, i) => {
      const where = `الخانة ${i + 1} في ${name}`;
      if (!item.prompt.trim())
        errors.push(item.kind === 'kashkool' ? `نص الكشكول (${where}) فارغ.` : `السؤال (${where}) فارغ.`);
      if (item.kind === 'question' && !item.answer?.trim()) errors.push(`إجابة السؤال (${where}) فارغة.`);
      if (item.prompt.length > 1000) errors.push(`نص ${where} أطول من ١٠٠٠ حرف.`);
      if ((item.answer?.length ?? 0) > 500) errors.push(`إجابة ${where} أطول من ٥٠٠ حرف.`);
    });
  }
  if (config.teams.length < 2) errors.push('أضف فريقين على الأقل.');
  config.teams.forEach((team, i) => {
    if (!team.name.trim()) errors.push(`اسم الفريق ${i + 1} فارغ.`);
    if (team.name.length > 40) errors.push(`اسم الفريق ${i + 1} أطول من ٤٠ حرفاً.`);
    if (!HEX.test(team.color)) errors.push(`لون الفريق ${i + 1} غير صالح.`);
  });
  const teams = config.teams.length;
  if (config.rounds.some(([a, b]) => a === b || !(a >= 1 && a <= teams) || !(b >= 1 && b <= teams)))
    errors.push('جدول الجولات يشير إلى فرق غير موجودة. أعد توليده.');
  const seen = new Set<string>();
  for (const entry of config.soundboard ?? []) {
    if (!entry.label.trim()) errors.push('زر في لوحة المؤثرات بلا اسم.');
    if (entry.label.length > 40) errors.push(`اسم زر المؤثرات «${entry.label}» أطول من ٤٠ حرفاً.`);
    if (!entry.id || seen.has(entry.id)) errors.push(`زر المؤثرات «${entry.label}» مكرر.`);
    seen.add(entry.id);
  }
  return errors;
}

// What a running game depends on: changing any of it would orphan recorded
// plays, so the server only allows it after a reset.
export function structureKey(config: GameConfig) {
  return JSON.stringify({
    teams: config.teams.length,
    categories: config.categories.map((c) => [
      c.id,
      c.items.map((i) => (i.kind === 'kashkool' ? 'k' : i.kanz ? 'z' : 'q')).join(''),
    ]),
  });
}

// Marks count random questions (one by default) as كنز in every category
// that has none.
export function drawKanz(categories: Category[], random = Math.random, count = 1): Category[] {
  return categories.map((category) => {
    if (category.items.some((i) => i.kanz)) return category;
    const options = category.items.flatMap((item, i) => (item.kind === 'question' ? [i] : []));
    const picks = new Set(shuffle(options, random).slice(0, count));
    return { ...category, items: category.items.map((item, i) => (picks.has(i) ? { ...item, kanz: true } : item)) };
  });
}

// Brings a stored row, a restored backup or a half-finished draft up to the
// current shape, filling anything missing with defaults.
export function migrateConfig(raw: unknown): GameConfig {
  const config = (raw ?? {}) as Partial<GameConfig>;
  return {
    ...config,
    title: config.title ?? '',
    pointsStep: config.pointsStep ?? 100,
    kashkoolPoints: config.kashkoolPoints ?? 1000,
    kanzMultiplier: config.kanzMultiplier ?? 2,
    // A hand-edited backup may miss nested fields; validation then names them.
    categories: (config.categories ?? []).map((c) => ({
      ...c,
      id: c.id ?? '',
      title: c.title ?? '',
      items: (c.items ?? []).map((item) => ({ ...item, kind: item.kind ?? 'question', prompt: item.prompt ?? '' })),
    })),
    teams: (config.teams ?? []).map((team) => ({ ...team, name: team.name ?? '', color: team.color ?? '' })),
    rounds: config.rounds ?? [],
    media: config.media ?? {},
  };
}
