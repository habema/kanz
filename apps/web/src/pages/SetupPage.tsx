import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Link } from 'wouter';
import {
  getGetAccessQueryKey,
  getGetGameSetupQueryKey,
  useGetAccess,
  useGetGameSetup,
  useResetGame,
  useSaveGameConfig,
} from '@kanz/api-client-react';
import type { GameSetup } from '@kanz/api-client-react';
import {
  generateSchedule,
  migrateConfig,
  sampleGame,
  totalTiles,
  validateConfig,
  type GameConfig,
} from '@kanz/game-core';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Image,
  LayoutGrid,
  ListOrdered,
  Monitor,
  RotateCcw,
  Rocket,
  Save,
  Shuffle,
  SlidersHorizontal,
  Undo2,
  Users,
  Volume2,
} from 'lucide-react';
import { AdminGate, PASSWORD_HINT, PasswordForm } from '@/components/AdminGate';
import { BackupButtons, RestoreButton } from '@/components/setup/Backup';
import { BrandingFields, BrandingSection, CelebrationsSection, SoundsSection } from '@/components/setup/Media';
import { PointsSection, QuestionsSection } from '@/components/setup/Questions';
import { ScheduleSection, TeamsSection, withSchedule } from '@/components/setup/Teams';
import type { SectionProps } from '@/components/setup/shared';
import { ControlHeader, Loading, Segmented, ServerError, goldButton, outlineButton } from '@/components/ui';
import { adminQuery, number, useRefreshGame } from '@/lib/game';
import { resolveMedia } from '@/lib/media';

// /setup: until a game is saved it walks through onboarding (password, name,
// teams, questions, rounds, media); afterwards it is a tabbed editor. Nothing
// changes on the screens until saved.
export function SetupPage() {
  const access = useGetAccess();
  const [finished, setFinished] = useState(false);
  if (access.isError) return <ServerError />;
  if (!access.data) return <Loading />;
  if (finished) return <Ready onContinue={() => setFinished(false)} />;
  if (!access.data.gameConfigured)
    return <Onboarding hasPassword={access.data.hasPassword} onDone={() => setFinished(true)} />;
  return <Editor />;
}

const errorText = (error: unknown) => (error as { data?: { error?: string } } | null)?.data?.error ?? 'تعذّر الحفظ.';

// The draft being edited; an enabled schedule follows the board's size.
function useDraft(initial: () => GameConfig) {
  const [draft, setDraft] = useState<GameConfig>(initial);
  const update = (patch: Partial<GameConfig>) => setDraft((d) => withSchedule(d, { ...d, ...patch }));
  return { draft, setDraft, update };
}

// Leaving with unsaved edits asks first.
function useLeaveWarning(on: boolean) {
  useEffect(() => {
    if (!on) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [on]);
}

function Footer({ width, children }: { width: string; children: ReactNode }) {
  return (
    <footer className="fixed inset-x-0 bottom-0 z-20 border-t border-white/10 bg-[#11131bf2] backdrop-blur-md">
      <div className={`mx-auto flex flex-wrap items-center gap-3 px-4 py-3 sm:px-8 ${width}`}>{children}</div>
    </footer>
  );
}

// ---------------------------------------------------------------- editor

type Tab = 'questions' | 'teams' | 'rounds' | 'branding' | 'sounds';
const TABS: { value: Tab; label: ReactNode }[] = [
  {
    value: 'questions',
    label: (
      <>
        <ListOrdered size={14} /> الأسئلة
      </>
    ),
  },
  {
    value: 'teams',
    label: (
      <>
        <Users size={14} /> الفرق
      </>
    ),
  },
  {
    value: 'rounds',
    label: (
      <>
        <Shuffle size={14} /> الجولات
      </>
    ),
  },
  {
    value: 'branding',
    label: (
      <>
        <Image size={14} /> الهوية والوسائط
      </>
    ),
  },
  {
    value: 'sounds',
    label: (
      <>
        <Volume2 size={14} /> الأصوات
      </>
    ),
  },
];

function Editor() {
  const query = useGetGameSetup({ query: { queryKey: getGetGameSetupQueryKey(), ...adminQuery() } });
  return <AdminGate query={query}>{query.data && <SetupEditor setup={query.data} />}</AdminGate>;
}

function SetupEditor({ setup }: { setup: GameSetup }) {
  const client = useQueryClient();
  const refreshGame = useRefreshGame();
  const { draft, setDraft, update } = useDraft(() => setup.config as GameConfig);
  const [base, setBase] = useState(() => JSON.stringify(setup.config));
  const [tab, setTab] = useState<Tab>(() => {
    const asked = new URLSearchParams(window.location.search).get('tab');
    return TABS.some((t) => t.value === asked) ? (asked as Tab) : 'questions';
  });
  const onSaved = (data: GameSetup) => {
    client.setQueryData(getGetGameSetupQueryKey(), data);
    setDraft(data.config as GameConfig);
    setBase(JSON.stringify(data.config));
    void refreshGame();
  };
  const save = useSaveGameConfig({ mutation: { onSuccess: onSaved } });
  const reset = useResetGame({
    mutation: {
      onSuccess: (data) => {
        client.setQueryData(getGetGameSetupQueryKey(), data);
        void refreshGame();
      },
    },
  });
  const dirty = JSON.stringify(draft) !== base;
  const errors = useMemo(() => validateConfig(draft), [draft]);
  useLeaveWarning(dirty);
  const props: SectionProps = { draft, update, locked: setup.started };
  const branding = { title: draft.title, kanzMultiplier: draft.kanzMultiplier, media: draft.media };

  return (
    <>
      <ControlHeader title="الإعداد" branding={branding}>
        <Segmented<Tab>
          tabs
          label="أقسام الإعداد"
          value={tab}
          onSelect={setTab}
          options={TABS.map((t) => ({ ...t, testId: `tab-${t.value}` }))}
        />
        <Link href="/admin" className={outlineButton}>
          <SlidersHorizontal size={14} /> الإدارة
        </Link>
      </ControlHeader>
      <main className="mx-auto max-w-[1450px] px-4 pb-40 pt-6 sm:px-8">
        {setup.started && (
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border border-[#f2c75d]/50 bg-[#f2c75d]/10 px-4 py-3 text-sm text-[#f2c75d]">
            <span>اللعبة جارية: تغيير الخانات أو الفرق أو مواقع الكنز والكشكول يحتاج لعبة جديدة.</span>
            <button
              type="button"
              disabled={reset.isPending}
              onClick={() => {
                if (window.confirm('مسح كل النقاط والخانات التي لُعبت والبدء من جديد؟')) reset.mutate();
              }}
              data-testid="button-reset-game"
              className="flex items-center gap-2 border border-[#f2c75d]/60 px-3 py-2 text-xs font-black hover:bg-[#f2c75d]/15"
            >
              <RotateCcw size={14} /> بدء لعبة جديدة
            </button>
          </div>
        )}
        {tab === 'questions' && (
          <div className="grid gap-6">
            <PointsSection {...props} />
            <QuestionsSection {...props} />
          </div>
        )}
        {tab === 'teams' && <TeamsSection {...props} />}
        {tab === 'rounds' && <ScheduleSection {...props} />}
        {tab === 'branding' && (
          <div className="mx-auto grid max-w-4xl gap-6">
            <BrandingSection {...props} />
            <CelebrationsSection {...props} />
          </div>
        )}
        {tab === 'sounds' && <SoundsSection {...props} />}
      </main>
      <Footer width="max-w-[1450px]">
        <div className="min-w-0 flex-1 text-xs">
          <Problems errors={errors} dirty={dirty} />
          {save.isError && <p className="mt-1 whitespace-pre-line text-[#ffadc2]">{errorText(save.error)}</p>}
        </div>
        <BackupButtons draft={draft} onRestore={setDraft} />
        <button type="button" disabled={!dirty} onClick={() => setDraft(JSON.parse(base))} className={outlineButton}>
          <Undo2 size={14} /> تراجع
        </button>
        <button
          type="button"
          disabled={!dirty || errors.length > 0 || save.isPending}
          onClick={() => save.mutate({ data: draft })}
          data-testid="button-save-config"
          className={`${goldButton} px-5 py-2.5 text-sm`}
        >
          <Save size={16} /> حفظ
        </button>
      </Footer>
    </>
  );
}

function Problems({ errors, dirty }: { errors: string[]; dirty: boolean }) {
  return errors.length > 0 ? (
    <details>
      <summary className="cursor-pointer font-bold text-[#ffadc2]">{number(errors.length)} مشكلة تمنع الحفظ</summary>
      <ul className="mt-2 max-h-40 list-inside list-disc overflow-y-auto text-[#dc96a9]">
        {errors.map((e, i) => (
          <li key={i}>{e}</li>
        ))}
      </ul>
    </details>
  ) : (
    <span className="flex items-center gap-1.5 text-[#82e6de]">
      <Check size={14} /> الإعداد صالح{dirty ? '، لم يُحفظ بعد' : ' ومحفوظ'}.
    </span>
  );
}

// ---------------------------------------------------------------- onboarding

const STEPS = [
  { id: 'password', label: 'كلمة المرور' },
  { id: 'start', label: 'الاسم' },
  { id: 'teams', label: 'الفرق' },
  { id: 'questions', label: 'الأسئلة' },
  { id: 'rules', label: 'الجولات' },
  { id: 'media', label: 'الكنز والكشكول' },
  { id: 'review', label: 'المراجعة' },
] as const;
const stepOf = (id: (typeof STEPS)[number]['id']) => STEPS.findIndex((s) => s.id === id);

// Onboarding starts from the sample's teams and questions, to edit or replace.
const blankGame = (): GameConfig => ({
  title: '',
  pointsStep: sampleGame.pointsStep,
  kashkoolPoints: sampleGame.kashkoolPoints,
  kanzMultiplier: sampleGame.kanzMultiplier,
  categories: structuredClone(sampleGame.categories),
  teams: structuredClone(sampleGame.teams),
  rounds: [],
  media: {},
});

// The draft survives a reload of this browser tab, so a half-finished setup
// isn't lost.
const STORE = 'quiz-onboarding';
function loadStored(): { step: number; draft: GameConfig; scheduled: boolean } | undefined {
  try {
    const raw = sessionStorage.getItem(STORE);
    if (!raw) return undefined;
    const stored = JSON.parse(raw);
    return { ...stored, draft: migrateConfig(stored.draft) };
  } catch {
    return undefined;
  }
}

function Onboarding({ hasPassword, onDone }: { hasPassword: boolean; onDone: () => void }) {
  const client = useQueryClient();
  const refreshGame = useRefreshGame();
  // Only answers once signed in; a 401 means the session ran out mid-setup.
  const session = useGetGameSetup({
    query: { queryKey: getGetGameSetupQueryKey(), enabled: hasPassword, ...adminQuery() },
  });
  const stored = useMemo(loadStored, []);
  const { draft, setDraft, update } = useDraft(() => stored?.draft ?? blankGame());
  const [step, setStep] = useState(stored?.step ?? 0);
  // Whether the schedule was switched on the first time the rounds step opened.
  const [scheduled, setScheduled] = useState(stored?.scheduled ?? false);
  useEffect(() => {
    try {
      sessionStorage.setItem(STORE, JSON.stringify({ step, draft, scheduled }));
    } catch {
      /* storage unavailable */
    }
  }, [step, draft, scheduled]);
  useLeaveWarning(!!draft.title.trim());
  const save = useSaveGameConfig({
    mutation: {
      onSuccess: (data) => {
        try {
          sessionStorage.removeItem(STORE);
        } catch {
          /* storage unavailable */
        }
        client.setQueryData(getGetGameSetupQueryKey(), data);
        void client.invalidateQueries({ queryKey: getGetAccessQueryKey() });
        void refreshGame();
        onDone();
      },
    },
  });
  const errors = useMemo(() => validateConfig(draft), [draft]);
  if (session.error?.status === 401) return <AdminGate query={session} />;

  // The password step is done for good once a password exists.
  const current = hasPassword ? Math.max(step, 1) : 0;
  const id = STEPS[current].id;
  const props: SectionProps = { draft, update };
  const go = (to: number) => {
    // The schedule starts switched on; the host can turn it off.
    if (STEPS[to]?.id === 'rules' && !scheduled) {
      setScheduled(true);
      if (!draft.rounds.length) update({ rounds: generateSchedule(draft.teams.length, totalTiles(draft)) });
    }
    setStep(to);
    window.scrollTo({ top: 0 });
  };
  // What keeps each step from moving on.
  const blocker = (() => {
    if (id === 'start' && !draft.title.trim()) return 'اكتب اسم المسابقة.';
    if (id === 'teams' && (draft.teams.length < 2 || draft.teams.some((t) => !t.name.trim())))
      return 'أضف فريقين على الأقل بأسماء.';
    if (id === 'questions') {
      if (totalTiles(draft) === 0) return 'أضف خانة واحدة على الأقل.';
      if (draft.categories.some((c) => !c.title.trim())) return 'سمِّ كل الفئات.';
      if (
        draft.categories.some((c) =>
          c.items.some((i) => !i.prompt.trim() || (i.kind === 'question' && !i.answer?.trim())),
        )
      )
        return 'أكمل نص كل خانة وإجابة كل سؤال.';
    }
    return null;
  })();

  return (
    <>
      <ControlHeader
        title="إعداد المسابقة"
        branding={{ title: draft.title || 'مسابقة جديدة', kanzMultiplier: draft.kanzMultiplier, media: draft.media }}
      >
        <ol className="flex flex-wrap gap-1 text-[11px] font-bold" aria-label="خطوات الإعداد">
          {STEPS.map((s, i) => (
            <li key={s.id}>
              <button
                type="button"
                disabled={i > current || (i === 0 && hasPassword)}
                onClick={() => go(i)}
                aria-current={i === current ? 'step' : undefined}
                className={`flex items-center gap-1.5 border px-2.5 py-1.5 ${i === current ? 'border-[#e9bb4f] bg-[#e9bb4f] text-[#14151c]' : i < current ? 'border-[#53cec4]/50 text-[#82e6de] enabled:hover:bg-[#53cec4]/10' : 'border-white/10 text-ink-35'}`}
              >
                {i < current ? <Check size={11} /> : <span className="tabular-nums">{number(i + 1)}</span>} {s.label}
              </button>
            </li>
          ))}
        </ol>
      </ControlHeader>
      <main className="mx-auto max-w-[1100px] px-4 pb-40 pt-6 sm:px-8">
        {id === 'password' && (
          <StepIntro title="كلمة مرور الإدارة" text={PASSWORD_HINT}>
            <section className="panel-bevel max-w-lg p-6">
              <PasswordForm create onDone={() => go(stepOf('start'))} />
            </section>
          </StepIntro>
        )}
        {id === 'start' && (
          <StepIntro title="اسم المسابقة" text="يظهر على الشاشة الرئيسية وفي صفحات الإدارة.">
            <section className="grid max-w-2xl gap-5 border border-white/10 border-t-2 border-t-[#e9bb4f] bg-white/[.03] p-6 sm:p-8">
              <BrandingFields {...props} large />
            </section>
            <div className="flex flex-wrap items-center gap-3 text-xs text-ink-45">
              <span>لديك نسخة احتياطية من تثبيت آخر؟</span>
              <RestoreButton onRestore={(config) => setDraft({ ...blankGame(), ...config })} />
            </div>
          </StepIntro>
        )}
        {id === 'teams' && (
          <StepIntro title="من سيتنافس؟" text="فرق المثال جاهزة؛ عدّل أسماءها وألوانها.">
            <TeamsSection {...props} />
          </StepIntro>
        )}
        {id === 'questions' && (
          <StepIntro
            title="الفئات والأسئلة"
            text="أسئلة المثال جاهزة؛ عدّلها أو استبدلها. كل فئة عمود، والخانات من الأسهل إلى الأصعب. الكشكول تحدٍّ، والجوهرة تجعل السؤال كنزاً."
          >
            <PointsSection {...props} />
            <QuestionsSection {...props} />
          </StepIntro>
        )}
        {id === 'rules' && (
          <StepIntro title="الجولات" text="من يلعب كل خانة.">
            <ScheduleSection {...props} />
          </StepIntro>
        )}
        {id === 'media' && (
          <StepIntro title="الكنز والكشكول" text="احتفالهما على الشاشة عند فتحهما. ارفع ملفاتك لتغيير أي منها.">
            <CelebrationsSection {...props} />
          </StepIntro>
        )}
        {id === 'review' && <Review draft={draft} errors={errors} onEdit={go} />}
      </main>
      {id !== 'password' && (
        <Footer width="max-w-[1100px]">
          <button type="button" disabled={current <= 1} onClick={() => go(current - 1)} className={outlineButton}>
            <ArrowRight size={14} /> السابق
          </button>
          <div className="min-w-0 flex-1 text-xs">
            {blocker && <span className="text-[#ffadc2]">{blocker}</span>}
            {save.isError && <p className="whitespace-pre-line text-[#ffadc2]">{errorText(save.error)}</p>}
          </div>
          {id === 'review' ? (
            <button
              type="button"
              disabled={errors.length > 0 || save.isPending}
              onClick={() => save.mutate({ data: draft })}
              data-testid="button-finish-setup"
              className={`${goldButton} px-5 py-2.5 text-sm`}
            >
              <Rocket size={16} /> حفظ وتجهيز المسابقة
            </button>
          ) : (
            <button
              type="button"
              disabled={!!blocker}
              onClick={() => go(current + 1)}
              data-testid="button-next-step"
              className={`${goldButton} px-5 py-2.5 text-sm`}
            >
              التالي <ArrowLeft size={16} />
            </button>
          )}
        </Footer>
      )}
    </>
  );
}

function StepIntro({ title, text, children }: { title: string; text: string; children: ReactNode }) {
  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-black">{title}</h1>
        <p className="mt-1 text-sm leading-7 text-ink-55">{text}</p>
      </div>
      {children}
    </div>
  );
}

function Review({ draft, errors, onEdit }: { draft: GameConfig; errors: string[]; onEdit: (step: number) => void }) {
  const items = draft.categories.flatMap((c) => c.items);
  const celebration = resolveMedia(draft.media);
  const rows: [string, string, number][] = [
    ['الاسم', draft.title, stepOf('start')],
    ['الفرق', `${number(draft.teams.length)}: ${draft.teams.map((t) => t.name).join('، ')}`, stepOf('teams')],
    [
      'اللوحة',
      `${number(draft.categories.length)} فئات، ${number(items.length)} خانة (${number(items.filter((i) => i.kind === 'kashkool').length)} كشكول، ${number(items.filter((i) => i.kanz).length)} كنز)`,
      stepOf('questions'),
    ],
    [
      'الجولات',
      draft.rounds.length ? `${number(draft.rounds.length)} جولة بجدول` : 'بلا جدول: يختار المقدم بحرية',
      stepOf('rules'),
    ],
    [
      'النقاط',
      `${number(draft.pointsStep)} للخانة الأولى، الكشكول ${number(draft.kashkoolPoints)}، الكنز ×${number(draft.kanzMultiplier)}`,
      stepOf('questions'),
    ],
    [
      'الاحتفال',
      `الكنز: ${celebration.kanz.mode === 'video' ? 'فيديو' : 'صورة'} · الكشكول: ${celebration.kashkool.mode === 'video' ? 'فيديو' : 'صورة'}`,
      stepOf('media'),
    ],
  ];
  return (
    <StepIntro title="جاهز تقريباً" text="راجع ثم احفظ لتظهر اللوحة على الشاشة الرئيسية.">
      <section className="panel-bevel divide-y divide-white/10">
        {rows.map(([label, value, step]) => (
          <div key={label} className="flex flex-wrap items-center gap-3 px-5 py-3">
            <span className="w-20 text-xs font-bold text-ink-45">{label}</span>
            <span className="min-w-0 flex-1 text-sm">
              <bdi>{value}</bdi>
            </span>
            <button
              type="button"
              onClick={() => onEdit(step)}
              className="text-xs font-bold text-[#82e6de] hover:underline"
            >
              تعديل
            </button>
          </div>
        ))}
      </section>
      {errors.length > 0 && (
        <section className="border border-[#e96791]/35 bg-[#e96791]/10 p-4 text-sm text-[#ffadc2]">
          <p className="font-black">{number(errors.length)} مشكلة يجب حلّها قبل الحفظ:</p>
          <ul className="mt-2 list-inside list-disc">
            {errors.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        </section>
      )}
    </StepIntro>
  );
}

// After onboarding: where each screen lives.
const PAGES: [string, string, string, ReactNode][] = [
  ['الشاشة الرئيسية', 'على جهاز العرض بملء الشاشة؛ انقر عليها مرة لتفعيل الصوت.', '', <LayoutGrid size={18} />],
  ['الإدارة', 'لإدارة اللعب من هاتف أو جهاز لوحي.', 'admin', <SlidersHorizontal size={18} />],
  ['غرفة المقدم', 'اختيارية: الإجابات والترتيب دون تحكم.', 'mc', <Monitor size={18} />],
];

function Ready({ onContinue }: { onContinue: () => void }) {
  const base = import.meta.env.BASE_URL;
  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <div className="panel-bevel p-6 sm:p-9">
        <p className="flex items-center gap-2 text-xs font-black tracking-widest text-[#53cec4]">
          <Check size={14} /> حُفظ الإعداد
        </p>
        <h1 className="mt-2 text-3xl font-black">المسابقة جاهزة!</h1>
        <div className="mt-6 grid gap-3">
          {PAGES.map(([title, text, path, icon]) => (
            <a
              key={title}
              href={`${base}${path}`}
              target={path ? undefined : '_blank'}
              rel="noreferrer"
              className="flex items-start gap-4 border border-white/15 bg-black/15 p-4 hover:border-[#e9bb4f]/60"
            >
              <span className="mt-0.5 text-[#f2c75d]">{icon}</span>
              <span className="min-w-0 flex-1">
                <span className="block font-black">{title}</span>
                <span className="block text-sm leading-6 text-ink-55">{text}</span>
                <span
                  dir="ltr"
                  className="mt-1 block text-xs text-ink-40"
                >{`${window.location.host}${base}${path}`}</span>
              </span>
            </a>
          ))}
        </div>
        <button type="button" onClick={onContinue} className={`${outlineButton} mt-6`}>
          <Save size={14} /> متابعة تعديل الإعداد
        </button>
      </div>
    </main>
  );
}
