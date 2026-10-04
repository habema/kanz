import { useState } from 'react';
import {
  useCancelTile,
  useEndIntro,
  useFinishTile,
  useOpenTile,
  usePlaySound,
  useSetAnswerVisibility,
  useSetRound,
  useSetMusic,
  useSetScreenView,
} from '@kanz/api-client-react';
import type { CurrentTile, Game, GameTeam, Music } from '@kanz/api-client-react';
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Crown,
  Eye,
  Gem,
  Hand,
  LayoutGrid,
  ListOrdered,
  Music2,
  PartyPopper,
  Pause,
  Play,
  RotateCcw,
  Sparkles,
  Square,
  Swords,
  Trophy,
  Undo2,
  Volume2,
  X,
} from 'lucide-react';
import { Link } from 'wouter';
import { ErrorLine, Segmented, TeamDot, TeamDotFor, goldButton } from '@/components/ui';
import { number, placeName, rankTeams, revealSteps, splitChallenge, teamName, useRefreshGame } from '@/lib/game';

// Pieces shared by the MC page (read-only) and the admin's control tab.

// The board with كنز/كشكول marked. Tiles are clickable only when onPick is given.
export function BoardGrid({
  game,
  onPick,
  disabled,
}: {
  game: Game;
  onPick?: (tileId: string) => void;
  disabled?: boolean;
}) {
  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-black">{onPick ? 'اختر الخانة التالية' : 'اللوحة'}</h1>
        <div className="flex items-center gap-4 text-xs text-ink-50">
          <span className="flex items-center gap-1.5">
            <Gem size={13} className="text-[#f2c75d]" /> كنز (النقاط ×{number(game.branding.kanzMultiplier)})
          </span>
          <span className="flex items-center gap-1.5">
            <PartyPopper size={13} className="text-[#ff7aa8]" /> كشكول
          </span>
        </div>
      </div>
      <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 210px), 1fr))' }}>
        {game.categories.map((category) => (
          <section key={category.id} className="panel-bevel p-3">
            <h2 className="mb-3 text-center text-base font-black">{category.title}</h2>
            <div className="grid grid-cols-3 gap-2">
              {category.tiles.map((tile) => {
                const className = `bevel-tile relative grid min-h-12 place-items-center tabular-nums text-base font-bold ${tile.kind === 'kashkool' ? 'tile-mark-kashkool' : tile.kanz ? 'tile-mark-kanz' : ''} ${!onPick && tile.used ? 'opacity-30' : ''}`;
                const content = (
                  <>
                    {number(tile.value)}
                    {tile.kanz && <Gem size={12} className="absolute left-1 top-1 text-[#8a5a00]" />}
                    {tile.kind === 'kashkool' && (
                      <PartyPopper size={12} className="absolute left-1 top-1 text-[#b0124f]" />
                    )}
                  </>
                );
                return onPick ? (
                  <button
                    type="button"
                    key={tile.id}
                    disabled={tile.used || disabled}
                    onClick={() => onPick(tile.id)}
                    data-testid={`button-mc-tile-${tile.id}`}
                    className={className}
                  >
                    {content}
                  </button>
                ) : (
                  <div key={tile.id} data-testid={`mc-tile-${tile.id}`} className={className}>
                    {content}
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </>
  );
}

export function PickableBoard({ game }: { game: Game }) {
  const refresh = useRefreshGame();
  const open = useOpenTile({ mutation: { onSuccess: refresh } });
  return (
    <>
      <BoardGrid game={game} onPick={(tileId) => open.mutate({ data: { tileId } })} disabled={open.isPending} />
      {open.isError && <ErrorLine text="تعذّر فتح الخانة. حاول مجدداً." />}
    </>
  );
}

// The open tile with its answer; controls (admin only) go in children.
export function TileCard({ game, tile, children }: { game: Game; tile: CurrentTile; children?: React.ReactNode }) {
  const kashkool = tile.kind === 'kashkool';
  const challenge = kashkool ? splitChallenge(tile.prompt) : null;
  return (
    <section
      className={`panel-bevel mx-auto max-w-4xl overflow-hidden ${kashkool ? 'card-kashkool' : tile.kanz ? 'card-kanz' : ''}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-black/20 px-5 py-4">
        <p className="text-sm font-bold text-ink-60">
          {tile.category} <span className="mx-1 text-ink-25">|</span> خانة {number(tile.value)}
        </p>
        <div className="flex flex-wrap gap-2">
          {kashkool && (
            <span className="pill pill-kashkool text-xs">
              <PartyPopper size={13} /> كشكول
            </span>
          )}
          {tile.kanz && (
            <span className="pill pill-kanz text-xs">
              <Gem size={13} /> كنز ×{number(game.branding.kanzMultiplier)}
            </span>
          )}
          <span className="pill pill-gold text-xs">{number(tile.points)} نقطة</span>
        </div>
      </div>
      <div className="p-5 sm:p-7">
        {game.intro && (
          <p className="mb-4 flex items-center gap-2 border border-[#f2c75d]/50 bg-[#f2c75d]/10 px-3 py-2 text-sm font-bold text-[#f2c75d]">
            <Sparkles size={15} /> الشاشة تعرض احتفال {kashkool ? 'الكشكول' : 'الكنز'} الآن، و
            {kashkool ? 'التحدي' : 'السؤال'} مخفي.
          </p>
        )}
        {challenge ? (
          <>
            <h2 className="text-2xl font-black leading-relaxed text-[#ffd0e1] sm:text-3xl">{challenge.title}</h2>
            {challenge.detail && <p className="mt-2 text-lg leading-relaxed text-ink-80">{challenge.detail}</p>}
          </>
        ) : (
          <h2 className="text-2xl font-black leading-relaxed sm:text-3xl">{tile.prompt}</h2>
        )}
        {!kashkool && (
          <div className="mt-5 border-2 border-[#53cec4]/60 bg-[#53cec4]/[.07] p-4">
            <p className="text-[10px] font-black tracking-[.18em] text-[#53cec4]">الإجابة (للمقدم فقط)</p>
            <p className="mt-1 text-xl font-black">{tile.answer || '—'}</p>
          </div>
        )}
        {!kashkool && game.answerState === 'hidden' && (
          <p className="mt-4 text-sm text-ink-50">الإجابة مخفية عن الشاشة.</p>
        )}
        {!kashkool && game.answerState === 'shown' && (
          <p className="mt-4 text-sm text-[#82e6de]">
            الإجابة ظاهرة على الشاشة
            {game.answerVerdict === 'correct' ? ' (صحيحة)' : game.answerVerdict === 'wrong' ? ' (خاطئة)' : ''}.
          </p>
        )}
        {children}
      </div>
    </section>
  );
}

export function TileControls({ game, tile }: { game: Game; tile: CurrentTile }) {
  const refresh = useRefreshGame();
  const answer = useSetAnswerVisibility({ mutation: { onSuccess: refresh } });
  const finish = useFinishTile({ mutation: { onSuccess: refresh } });
  const cancel = useCancelTile({ mutation: { onSuccess: refresh } });
  const endIntro = useEndIntro({ mutation: { onSuccess: refresh } });
  // Rendered with key={tile.id}, so the choice resets for each tile.
  const [teamId, setTeamId] = useState<number | null>(null);
  const kashkool = tile.kind === 'kashkool';
  const decided = !game.intro && (kashkool || game.answerState !== 'pending');
  const busy = answer.isPending || finish.isPending || cancel.isPending || endIntro.isPending;
  // كنز/كشكول tiles start with the celebration step.
  const first = kashkool || tile.kanz ? 2 : 1;
  const team = game.teams.find((t) => t.id === teamId);
  const playing = game.match.current ? [game.match.current.picker, game.match.current.opponent] : [];
  return (
    <TileCard game={game} tile={tile}>
      {game.intro && (
        <Step n={1} title={`الاحتفال يعمل على الشاشة. متى تُعرض ${kashkool ? 'التحدي' : 'السؤال'}؟`}>
          <button
            type="button"
            disabled={busy}
            onClick={() => endIntro.mutate()}
            data-testid="button-end-intro"
            className={`flex w-full items-center justify-center gap-2 border px-4 py-4 font-black disabled:opacity-40 ${kashkool ? 'border-[#ff7aa8]/70 bg-[#ff7aa8]/10 text-[#ffadc2] hover:bg-[#ff7aa8]/20' : 'border-[#f2c75d]/70 bg-[#f2c75d]/10 text-[#f2c75d] hover:bg-[#f2c75d]/20'}`}
          >
            <Sparkles size={18} /> إنهاء الاحتفال وعرض {kashkool ? 'التحدي' : 'السؤال'}
          </button>
        </Step>
      )}
      {!game.intro && !decided && (
        <Step n={first} title="كيف كانت الإجابة؟ تُعرض الإجابة على الشاشة في الحالات الثلاث">
          <div className="grid gap-3 sm:grid-cols-3">
            <button
              type="button"
              disabled={busy}
              onClick={() => answer.mutate({ data: { show: true, verdict: 'correct' } })}
              data-testid="button-answer-correct"
              className="flex items-center justify-center gap-2 border border-[#3ed598]/70 bg-[#3ed598]/10 px-4 py-4 font-black text-[#7ff0bf] hover:bg-[#3ed598]/20 disabled:opacity-40"
            >
              <Check size={18} /> صحيحة + مؤثر
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => answer.mutate({ data: { show: true, verdict: 'wrong' } })}
              data-testid="button-answer-wrong"
              className="flex items-center justify-center gap-2 border border-[#ff5c7a]/70 bg-[#ff5c7a]/10 px-4 py-4 font-black text-[#ffadc2] hover:bg-[#ff5c7a]/20 disabled:opacity-40"
            >
              <X size={18} /> خاطئة + مؤثر
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => answer.mutate({ data: { show: true } })}
              data-testid="button-show-answer"
              className="flex items-center justify-center gap-2 border border-[#53cec4]/70 bg-[#53cec4]/10 px-4 py-4 font-black text-[#82e6de] hover:bg-[#53cec4]/20 disabled:opacity-40"
            >
              <Eye size={18} /> إظهار بدون مؤثر
            </button>
          </div>
        </Step>
      )}
      {!kashkool && game.answerState === 'hidden' && (
        <button
          type="button"
          disabled={busy}
          onClick={() => answer.mutate({ data: { show: true } })}
          className="mt-1 text-sm font-bold text-[#82e6de] underline-offset-4 hover:underline"
        >
          إظهارها الآن
        </button>
      )}

      {decided && (
        <Step n={kashkool ? first : first + 1} title={kashkool ? 'من فاز بالتحدي؟' : 'من يستحق النقاط؟'}>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-5">
            {game.teams.map((t) => (
              <button
                type="button"
                key={t.id}
                disabled={busy}
                onClick={() => setTeamId((id) => (id === t.id ? null : t.id))}
                data-testid={`button-team-${t.id}`}
                className={`min-h-[56px] border px-3 py-2 text-right transition ${teamId === t.id ? 'border-[#f2c75d] bg-[#f2c75d]/15 text-[#f2c75d]' : playing.includes(t.id) ? 'border-[#53cec4]/60 bg-[#53cec4]/[.08] text-white hover:border-[#53cec4]' : 'border-white/15 bg-black/15 text-ink-75 hover:border-white/35'}`}
              >
                <span className="flex items-center gap-2 text-sm font-black">
                  <TeamDot color={t.color} />
                  <span className="truncate">
                    <bdi>{t.name}</bdi>
                  </span>
                </span>
                {playing.includes(t.id) && (
                  <span className="block text-[10px] font-bold text-[#82e6de]">يلعب هذه الجولة</span>
                )}
                <span className="mt-0.5 block tabular-nums text-[11px] text-ink-40">{number(t.score)}</span>
              </button>
            ))}
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_auto]">
            <button
              type="button"
              disabled={!team || busy}
              onClick={() => team && finish.mutate({ data: { teamId: team.id } })}
              data-testid="button-award-points"
              className={`${goldButton} px-5 py-4`}
            >
              <Trophy size={18} />
              {team ? `منح ${number(tile.points)} نقطة لـ \u2068${team.name}\u2069 وإنهاء` : 'اختر فريقاً لمنح النقاط'}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => finish.mutate({ data: {} })}
              data-testid="button-finish-no-points"
              className="border border-white/20 px-5 py-4 text-sm font-bold text-ink-70 hover:border-white/50 hover:text-white disabled:opacity-35"
            >
              إنهاء بدون نقاط
            </button>
          </div>
        </Step>
      )}

      {(answer.isError || finish.isError || cancel.isError || endIntro.isError) && (
        <ErrorLine text="لم يكتمل الإجراء. حاول مرة أخرى." />
      )}
      <div className="mt-6 border-t border-white/10 pt-4">
        <button
          type="button"
          disabled={busy}
          onClick={() => {
            if (window.confirm('إغلاق الخانة وإعادتها إلى اللوحة؟')) cancel.mutate();
          }}
          data-testid="button-cancel-tile"
          className="flex items-center gap-2 text-xs text-ink-40 hover:text-ink-80"
        >
          <Undo2 size={14} /> فُتحت بالخطأ؟ أغلقها وأعدها إلى اللوحة
        </button>
      </div>
    </TileCard>
  );
}

// This round's scheduled teams and the next pair. With editable, the admin can
// move the schedule by hand (it advances by itself whenever a tile is finished).
export function MatchPanel({ game, editable }: { game: Game; editable?: boolean }) {
  const refresh = useRefreshGame();
  const setRound = useSetRound({ mutation: { onSuccess: refresh } });
  const { round, total, current, next } = game.match;
  const move = (to: number) => setRound.mutate({ data: { round: to } });
  return (
    <section className="panel-bevel p-4" data-testid="match-panel">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-sm font-black">
          <Swords size={15} className="text-[#53cec4]" />{' '}
          {current ? `الجولة ${number(round)} من ${number(total)}` : `انتهت الجولات الـ${number(total)}`}
        </h2>
        {editable && (
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={setRound.isPending || round <= 1}
              onClick={() => move(round - 1)}
              title="الجولة السابقة"
              aria-label="الجولة السابقة"
              data-testid="button-round-prev"
              className="grid h-8 w-8 place-items-center border border-white/15 text-ink-60 hover:text-white disabled:opacity-25"
            >
              <ChevronRight size={16} />
            </button>
            <button
              type="button"
              disabled={setRound.isPending || !current}
              onClick={() => move(round + 1)}
              title="الجولة التالية"
              aria-label="الجولة التالية"
              data-testid="button-round-next"
              className="grid h-8 w-8 place-items-center border border-white/15 text-ink-60 hover:text-white disabled:opacity-25"
            >
              <ChevronLeft size={16} />
            </button>
          </div>
        )}
      </div>
      {current && (
        <>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-sm font-black">
            <span className="flex min-w-0 items-center gap-1.5 border border-[#f2c75d] bg-[#f2c75d]/10 px-2.5 py-1.5 text-[#f2c75d]">
              <Hand size={14} className="shrink-0" />
              <TeamDotFor teams={game.teams} id={current.picker} className="mx-1" />
              <span className="truncate">
                <bdi>{teamName(game.teams, current.picker)}</bdi>
              </span>
              <span className="text-[11px] text-[#bd9b4d]">يختار</span>
            </span>
            <span className="text-xs text-ink-40">ضد</span>
            <span className="flex min-w-0 items-center border border-white/20 px-2.5 py-1.5">
              <TeamDotFor teams={game.teams} id={current.opponent} className="mx-1" />
              <span className="truncate">
                <bdi>{teamName(game.teams, current.opponent)}</bdi>
              </span>
            </span>
          </div>
          {next && (
            <p className="mt-2 text-xs text-ink-45">
              التالي: <TeamDotFor teams={game.teams} id={next.picker} className="mx-1" />
              <span className="text-ink-75">
                <bdi>{teamName(game.teams, next.picker)}</bdi>
              </span>{' '}
              (يختار) ضد <TeamDotFor teams={game.teams} id={next.opponent} className="mx-1" />
              <span className="text-ink-75">
                <bdi>{teamName(game.teams, next.opponent)}</bdi>
              </span>
            </p>
          )}
        </>
      )}
      {setRound.isError && <ErrorLine text="تعذّر تغيير الجولة." />}
    </section>
  );
}

// What the main screen shows between tiles.
export function ViewToggle({ game }: { game: Game }) {
  const refresh = useRefreshGame();
  const view = useSetScreenView({ mutation: { onSuccess: refresh } });
  const busyTile = game.current ? 'أنهِ الخانة المفتوحة أولاً' : undefined;
  return (
    <Segmented
      label="ما يظهر على الشاشة الرئيسية"
      value={game.view}
      disabled={view.isPending}
      onSelect={(v) => {
        if (v !== game.view) view.mutate({ data: v === 'reveal' ? { view: v, revealStep: 0 } : { view: v } });
      }}
      options={[
        {
          value: 'board',
          label: (
            <>
              <LayoutGrid size={14} /> الشاشة: اللوحة
            </>
          ),
          testId: 'button-view-board',
        },
        {
          value: 'scoreboard',
          label: (
            <>
              <Trophy size={14} /> الشاشة: الترتيب
            </>
          ),
          disabled: !!game.current,
          title: busyTile,
          testId: 'button-view-scoreboard',
        },
        {
          value: 'reveal',
          label: (
            <>
              <ListOrdered size={14} /> الشاشة: كشف الترتيب
            </>
          ),
          disabled: !!game.current,
          title: busyTile ?? 'يكشف الفرق واحداً تلو الآخر من الأخير إلى الأول',
          testId: 'button-view-reveal',
        },
      ]}
    />
  );
}

// Steps through the leaderboard reveal (see revealSteps): one press per card
// from last place up, two for each top-3 team (spotlight with drumroll, then
// the name), and one more to end the champion's spotlight.
export function RevealPanel({ game }: { game: Game }) {
  const refresh = useRefreshGame();
  const view = useSetScreenView({ mutation: { onSuccess: refresh } });
  const ranked = rankTeams(game.teams);
  const steps = revealSteps(ranked);
  const step = Math.min(game.revealStep ?? 0, steps.length);
  const go = (to: number) => view.mutate({ data: { view: 'reveal', revealStep: to } });
  const next = steps[step];
  const opened = new Set(
    steps.slice(0, step).flatMap((s) => (s.kind === 'open' || s.kind === 'name' ? [s.position] : [])),
  );
  const last = steps[step - 1];
  const teased = last?.kind === 'tease' ? last.position : undefined;
  const busy = view.isPending;
  const entry = next && next.kind !== 'finale' ? ranked[next.position] : undefined;
  return (
    <section className="panel-bevel p-4" data-testid="reveal-panel">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-sm font-black">
          <ListOrdered size={15} className="text-[#f2c75d]" /> كشف الترتيب{' '}
          <span className="font-bold text-ink-45">
            · كُشف {number(opened.size)} من {number(ranked.length)}
          </span>
        </h2>
        <div className="flex items-center gap-1">
          <button
            type="button"
            disabled={busy || step <= 0}
            onClick={() => go(step - 1)}
            title="خطوة للخلف"
            aria-label="خطوة للخلف"
            data-testid="button-reveal-back"
            className="grid h-8 w-8 place-items-center border border-white/15 text-ink-60 hover:text-white disabled:opacity-25"
          >
            <ChevronRight size={16} />
          </button>
          <button
            type="button"
            disabled={busy || step === 0}
            onClick={() => {
              if (window.confirm('إخفاء كل الفرق والبدء من جديد؟')) go(0);
            }}
            title="من البداية"
            aria-label="من البداية"
            data-testid="button-reveal-restart"
            className="grid h-8 w-8 place-items-center border border-white/15 text-ink-60 hover:text-white disabled:opacity-25"
          >
            <RotateCcw size={14} />
          </button>
        </div>
      </div>
      {/* Last place on the right, first on the left, lit as they are unveiled. */}
      <div className="mt-3 flex gap-1" aria-hidden>
        {ranked
          .map((_, i) => ranked.length - 1 - i)
          .map((pos) => (
            <span
              key={pos}
              className={`h-1.5 flex-1 ${opened.has(pos) ? (ranked[pos].rank <= 3 ? 'bg-[#f2c75d]' : 'bg-[#53cec4]') : teased === pos ? 'animate-pulse bg-[#f2c75d]/50' : 'bg-white/10'}`}
            />
          ))}
      </div>
      <div className="mt-4">
        {next ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => go(step + 1)}
            data-testid="button-reveal-next"
            className={`flex w-full items-center justify-center gap-2 px-5 py-4 font-black disabled:opacity-35 ${next.kind === 'tease' ? 'border border-[#9d8cff]/70 bg-[#9d8cff]/15 text-[#d6ceff] hover:bg-[#9d8cff]/25' : 'bg-[#e9bb4f] text-[#17171a] hover:bg-[#f5cf73]'}`}
          >
            {next.kind === 'finale' && (
              <>
                <Trophy size={18} /> إنهاء لحظة البطل وعرض الترتيب كاملاً
              </>
            )}
            {next.kind === 'open' && entry && (
              <>
                <Eye size={18} /> كشف {placeName(entry.rank)}: <bdi>{entry.team.name}</bdi>{' '}
                <span className="tabular-nums font-bold opacity-60">({number(entry.team.score)})</span>
              </>
            )}
            {next.kind === 'tease' && entry && (
              <>
                <Sparkles size={18} /> بدء لحظة {placeName(entry.rank)} (طبول، الاسم مخفي){' '}
                <span className="font-bold opacity-70">
                  · <bdi>{entry.team.name}</bdi>
                </span>
              </>
            )}
            {next.kind === 'name' && entry && (
              <>
                <Crown size={18} /> كشف الاسم: <bdi>{entry.team.name}</bdi>{' '}
                <span className="tabular-nums font-bold opacity-60">({number(entry.team.score)})</span>
              </>
            )}
          </button>
        ) : (
          <p className="flex items-center justify-center gap-2 border border-[#53cec4]/50 bg-[#53cec4]/10 px-5 py-4 text-sm font-black text-[#82e6de]">
            <Check size={16} /> اكتمل الكشف. الترتيب الكامل على الشاشة.
          </p>
        )}
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[11px] text-ink-40">
        <span>
          المراكز الثلاثة الأولى بضغطتين: الأولى تبدأ اللحظة مع الطبول، والثانية تكشف الاسم. يبقى البطل على الشاشة حتى
          تضغط مرة أخرى.
        </span>
        {next && (
          <button
            type="button"
            disabled={busy}
            onClick={() => go(steps.length)}
            data-testid="button-reveal-all"
            className="font-bold text-ink-55 underline-offset-4 hover:text-white hover:underline disabled:opacity-30"
          >
            كشف الكل الآن
          </button>
        )}
      </div>
      {view.isError && <ErrorLine text="تعذّر تحديث الكشف." />}
    </section>
  );
}

export function Soundboard({ music, sounds }: { music: Music; sounds: Game['soundboard'] }) {
  const play = usePlaySound();
  return (
    <section className="panel-bevel mx-auto mt-6 max-w-4xl p-4 sm:p-5">
      <MusicControl music={music} />
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-sm font-black">
          <Volume2 size={16} className="text-[#53cec4]" /> المؤثرات الصوتية
        </h2>
        <button
          type="button"
          onClick={() => play.mutate({ data: { name: 'stop' } })}
          title="يوقف المؤثر الحالي وموسيقى الاحتفال والتشويق"
          data-testid="button-sound-stop"
          className="flex items-center gap-2 border border-white/20 px-3 py-2 text-xs font-bold text-ink-70 hover:border-white/50 hover:text-white"
        >
          <Square size={12} /> إيقاف
        </button>
      </div>
      {sounds.length ? (
        <div className="flex flex-wrap gap-2">
          {sounds.map((s) => (
            <button
              type="button"
              key={s.id}
              onClick={() => play.mutate({ data: { name: s.id } })}
              data-testid={`button-sound-${s.id}`}
              className="min-h-11 border border-[#9d8cff]/50 bg-black/15 px-3 py-2 text-sm font-black text-[#d6ceff] hover:bg-[#9d8cff]/15"
            >
              <bdi>{s.label}</bdi>
            </button>
          ))}
        </div>
      ) : (
        <p className="text-sm text-ink-45">لا أزرار في لوحة المؤثرات.</p>
      )}
      {play.isError && <ErrorLine text="تعذّر تشغيل الصوت. حاول مجدداً." />}
      <p className="mt-3 text-[11px] text-ink-35">
        يُشغَّل على الشاشة الرئيسية بعد النقر عليها مرة واحدة.{' '}
        <Link href="/setup?tab=sounds" className="underline-offset-4 hover:text-white hover:underline">
          تخصيص الأزرار
        </Link>
      </p>
    </section>
  );
}

// The background music on the main screen. It pauses by itself while any
// other sound plays there.
function MusicControl({ music }: { music: Music }) {
  const refresh = useRefreshGame();
  const set = useSetMusic({ mutation: { onSuccess: refresh } });
  // Set while the slider is being dragged; sent when it is released.
  const [volume, setVolume] = useState<number | null>(null);
  const shown = Math.round((volume ?? music.volume) * 100);
  const commit = () => {
    if (volume !== null) set.mutate({ data: { on: music.on, volume } }, { onSettled: () => setVolume(null) });
  };
  return (
    <div className="mb-4 flex flex-wrap items-center gap-3 border-b border-white/10 pb-4">
      <h2 className="flex items-center gap-2 text-sm font-black">
        <Music2 size={16} className="text-[#f2c75d]" /> موسيقى الخلفية
      </h2>
      <button
        type="button"
        disabled={set.isPending}
        onClick={() => set.mutate({ data: { on: !music.on, volume: music.volume } })}
        data-testid="button-music-toggle"
        className={`flex items-center gap-2 border px-3 py-2 text-xs font-bold disabled:opacity-40 ${music.on ? 'border-[#f2c75d]/60 text-[#f2c75d] hover:bg-[#f2c75d]/15' : 'border-white/20 text-ink-70 hover:border-white/50 hover:text-white'}`}
      >
        {music.on ? (
          <>
            <Pause size={12} /> إيقاف مؤقت
          </>
        ) : (
          <>
            <Play size={12} /> تشغيل
          </>
        )}
      </button>
      <label className="flex min-w-[180px] flex-1 items-center gap-2 text-xs text-ink-50">
        الصوت
        <input
          type="range"
          min={0}
          max={100}
          step={5}
          value={shown}
          onChange={(e) => setVolume(Number(e.target.value) / 100)}
          onPointerUp={commit}
          onKeyUp={commit}
          onBlur={commit}
          data-testid="input-music-volume"
          className="min-w-0 flex-1 accent-[#e9bb4f]"
        />
        <span className="w-8 tabular-nums">{number(shown)}٪</span>
      </label>
      {set.isError && <ErrorLine text="تعذّر تغيير الموسيقى." />}
    </div>
  );
}

// Compact ranked team list for the MC page.
export function Standings({ teams }: { teams: GameTeam[] }) {
  return (
    <ol className="grid gap-1.5">
      {rankTeams(teams).map(({ team, rank }) => (
        <li key={team.id} className="flex items-center gap-3 border border-white/10 bg-black/15 px-3 py-2">
          <span
            className={`grid h-7 w-7 shrink-0 place-items-center text-xs font-black ${rank === 1 && team.score > 0 ? 'bg-[#e9bb4f] text-[#14151c]' : 'bg-white/10 text-ink-70'}`}
          >
            {number(rank)}
          </span>
          <TeamDot color={team.color} />
          <span className="min-w-0 flex-1 truncate text-sm font-bold">
            <bdi>{team.name}</bdi>
          </span>
          <span className="tabular-nums text-sm font-black text-[#f2c75d]">{number(team.score)}</span>
        </li>
      ))}
    </ol>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <div className="mt-6 border-t border-white/10 pt-5">
      <p className="mb-3 flex items-center gap-2 text-sm font-black">
        <span className="grid h-6 w-6 place-items-center bg-[#e9bb4f] text-xs text-[#14151c]">{number(n)}</span>
        {title}
      </p>
      {children}
    </div>
  );
}
