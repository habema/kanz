import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Link } from 'wouter';
import {
  getGetHostGameQueryKey,
  getGetPlaysQueryKey,
  useGetHostGame,
  useGetPlays,
  useLogout,
  useRestoreTile,
  useUpdatePlay,
  useUpdateTeams,
} from '@kanz/api-client-react';
import type { Game, GameTeam, Play, PlayLog } from '@kanz/api-client-react';
import { Gem, Monitor, PartyPopper, Settings, SlidersHorizontal, Wrench } from 'lucide-react';
import { AdminGate } from '@/components/AdminGate';
import { MatchPanel, PickableBoard, RevealPanel, Soundboard, TileControls, ViewToggle } from '@/components/Control';
import { ControlHeader, Loading, Segmented, TeamDot, goldButton, input } from '@/components/ui';
import { adminQuery, number, useRefreshGame } from '@/lib/game';

type Tab = 'control' | 'corrections';
const headerLink =
  'flex items-center gap-1 border border-white/15 px-3 py-2 text-xs font-bold text-ink-60 hover:text-white';

// Runs the game: the control tab drives the main screen, the corrections tab
// renames teams and fixes any tile's award.
export function AdminPage() {
  const [tab, setTab] = useState<Tab>('control');
  const game = useGetHostGame({ query: { queryKey: getGetHostGameQueryKey(), ...adminQuery(1000) } });
  const client = useQueryClient();
  const logout = useLogout({ mutation: { onSuccess: () => client.resetQueries() } });
  return (
    <AdminGate query={game}>
      {game.data && (
        <>
          <ControlHeader title="الإدارة" branding={game.data.branding}>
            <Segmented<Tab>
              tabs
              label="أقسام الإدارة"
              value={tab}
              onSelect={setTab}
              options={[
                {
                  value: 'control',
                  label: (
                    <>
                      <SlidersHorizontal size={14} /> التحكم
                    </>
                  ),
                  testId: 'tab-control',
                },
                {
                  value: 'corrections',
                  label: (
                    <>
                      <Wrench size={14} /> التصحيحات
                    </>
                  ),
                  testId: 'tab-corrections',
                },
              ]}
            />
            <Link href="/setup" aria-label="الإعداد" className={headerLink}>
              <Settings size={14} />
              <span className="hidden sm:inline">الإعداد</span>
            </Link>
            <Link href="/mc" aria-label="غرفة المقدم" className={headerLink}>
              <Monitor size={14} />
              <span className="hidden sm:inline">غرفة المقدم</span>
            </Link>
            <button
              type="button"
              onClick={() => logout.mutate()}
              className="px-2 py-2 text-xs text-ink-40 hover:text-white"
            >
              خروج
            </button>
          </ControlHeader>
          {tab === 'control' ? <ControlTab game={game.data} /> : <CorrectionsTab />}
        </>
      )}
    </AdminGate>
  );
}

// Everything that drives the main screen.
function ControlTab({ game }: { game: Game }) {
  return (
    <main className="mx-auto max-w-[1450px] px-4 py-6 sm:px-8">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-ink-45">كل ما يظهر على الشاشة الرئيسية يُدار من هنا.</p>
        <ViewToggle game={game} />
      </div>
      {game.match.total > 0 && (
        <div className="mx-auto mb-5 max-w-4xl">
          <MatchPanel game={game} editable />
        </div>
      )}
      {game.current ? (
        <TileControls key={game.current.id} game={game} tile={game.current} />
      ) : (
        <>
          {game.view === 'reveal' && (
            <div className="mx-auto mb-5 max-w-4xl">
              <RevealPanel game={game} />
            </div>
          )}
          <PickableBoard game={game} />
        </>
      )}
      <Soundboard music={game.music} sounds={game.soundboard} />
    </main>
  );
}

function CorrectionsTab() {
  const plays = useGetPlays({ query: { queryKey: getGetPlaysQueryKey(), ...adminQuery(3000) } });
  if (!plays.data) return <Loading />;
  return (
    <main className="mx-auto grid max-w-[1450px] gap-6 px-4 py-6 sm:px-8 2xl:grid-cols-[360px_minmax(0,1fr)]">
      <TeamsEditor teams={plays.data.teams} />
      <PlaysTable log={plays.data} />
    </main>
  );
}

function TeamsEditor({ teams }: { teams: GameTeam[] }) {
  const refresh = useRefreshGame();
  const [draft, setDraft] = useState<Record<number, string> | null>(null);
  const save = useUpdateTeams({
    mutation: {
      onSuccess: () => {
        setDraft(null);
        void refresh();
      },
    },
  });
  const names = draft ?? Object.fromEntries(teams.map((t) => [t.id, t.name]));
  const dirty = draft !== null && teams.some((t) => (draft[t.id] ?? t.name) !== t.name);
  const valid = teams.every((t) => (names[t.id] ?? '').trim().length > 0);
  return (
    <section className="panel-bevel self-start p-5">
      <h2 className="text-lg font-black">الفرق</h2>
      <p className="mt-1 text-xs text-ink-45">تظهر الأسماء فوراً على الشاشة الرئيسية ولوحة الترتيب.</p>
      <form
        className="mt-4 grid gap-2 sm:grid-cols-2 2xl:grid-cols-1"
        onSubmit={(e) => {
          e.preventDefault();
          save.mutate({ data: { teams: teams.map((t) => ({ id: t.id, name: names[t.id].trim() })) } });
        }}
      >
        {teams.map((t) => (
          <label key={t.id} className="flex items-center gap-3">
            <span className="w-6 text-center tabular-nums text-xs text-ink-40">{number(t.id)}</span>
            <TeamDot color={t.color} />
            <input
              value={names[t.id] ?? ''}
              maxLength={40}
              onChange={(e) => setDraft({ ...names, [t.id]: e.target.value })}
              data-testid={`input-team-${t.id}`}
              className={`${input} min-w-0 flex-1`}
            />
            <span className="w-16 text-left tabular-nums text-sm text-[#f2c75d]">{number(t.score)}</span>
          </label>
        ))}
        <div className="flex items-center gap-3 pt-2 sm:col-span-2 2xl:col-span-1">
          <button
            disabled={!dirty || !valid || save.isPending}
            data-testid="button-save-teams"
            className={`${goldButton} px-5 py-2 text-sm`}
          >
            حفظ الأسماء
          </button>
          {dirty && (
            <button type="button" onClick={() => setDraft(null)} className="text-xs text-ink-50 hover:text-white">
              تراجع
            </button>
          )}
          {save.isError && <span className="text-xs text-[#ff9db6]">تعذّر الحفظ</span>}
        </div>
      </form>
    </section>
  );
}

function PlaysTable({ log }: { log: PlayLog }) {
  return (
    <section className="panel-bevel min-w-0 p-5">
      <h2 className="text-lg font-black">الخانات التي لُعبت</h2>
      <p className="mt-1 text-xs text-ink-45">
        غيّر الفريق أو النقاط لأي خانة، أو أعدها إلى اللوحة لتُلعب من جديد. مجموع الفرق يُحسب من هذا الجدول.
      </p>
      {log.plays.length === 0 ? (
        <p className="mt-8 text-center text-sm text-ink-40">لم تُلعب أي خانة بعد.</p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b border-white/10 text-right text-[11px] text-ink-40">
                <th className="py-2 pl-3 font-bold">#</th>
                <th className="py-2 pl-3 font-bold">الخانة</th>
                <th className="py-2 pl-3 font-bold">السؤال</th>
                <th className="py-2 pl-3 font-bold">الفريق</th>
                <th className="py-2 pl-3 font-bold">النقاط</th>
                <th />
              </tr>
            </thead>
            {/* Keyed on the saved award, so a row resets when it changes elsewhere. */}
            <tbody>
              {log.plays.map((play, i) => (
                <PlayRow key={`${play.tileId}:${play.teamId}:${play.points}`} index={i} play={play} teams={log.teams} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function PlayRow({ index, play, teams }: { index: number; play: Play; teams: GameTeam[] }) {
  const refresh = useRefreshGame();
  const [teamId, setTeamId] = useState(play.teamId);
  const [points, setPoints] = useState(String(play.teamId === undefined ? play.defaultPoints : play.points));
  const update = useUpdatePlay({ mutation: { onSuccess: refresh } });
  const restore = useRestoreTile({ mutation: { onSuccess: refresh } });
  const parsed = Number(points);
  const pointsValid = Number.isInteger(parsed) && parsed >= 0;
  const dirty = teamId !== play.teamId || (teamId !== undefined && parsed !== play.points);
  const busy = update.isPending || restore.isPending || play.open;
  return (
    <tr className="border-b border-white/[.06] align-middle">
      <td className="py-2 pl-3 tabular-nums text-xs text-ink-40">{number(index + 1)}</td>
      <td className="py-2 pl-3 whitespace-nowrap">
        <span className="font-bold">{play.category}</span>{' '}
        <span className="tabular-nums text-ink-60">{number(play.value)}</span>
        {play.kanz && <Gem size={13} className="mr-1.5 inline text-[#f2c75d]" />}
        {play.kind === 'kashkool' && <PartyPopper size={13} className="mr-1.5 inline text-[#ff7aa8]" />}
      </td>
      <td className="max-w-[320px] truncate py-2 pl-3 text-ink-60" title={play.prompt}>
        {play.prompt}
      </td>
      <td className="py-2 pl-3">
        {play.open ? (
          <span className="text-xs text-[#f2c75d]">مفتوحة الآن</span>
        ) : (
          <select
            value={teamId ?? ''}
            onChange={(e) => setTeamId(e.target.value ? Number(e.target.value) : undefined)}
            aria-label="الفريق"
            data-testid={`select-play-${play.tileId}`}
            className="border border-white/15 bg-[#151820] px-2 py-1.5 text-sm outline-none focus:border-[#e9bb4f]"
          >
            <option value="">— لا أحد —</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>{`⁨${t.name}⁩`}</option>
            ))}
          </select>
        )}
      </td>
      <td className="py-2 pl-3">
        <input
          type="number"
          min={0}
          step={100}
          value={teamId === undefined ? '' : points}
          disabled={teamId === undefined || play.open}
          onChange={(e) => setPoints(e.target.value)}
          aria-label="النقاط"
          data-testid={`input-points-${play.tileId}`}
          className="w-24 border border-white/15 bg-black/30 px-2 py-1.5 tabular-nums text-sm outline-none focus:border-[#e9bb4f] disabled:opacity-30"
          dir="ltr"
        />
      </td>
      <td className="py-2 whitespace-nowrap text-left">
        <button
          type="button"
          disabled={!dirty || !pointsValid || busy}
          onClick={() =>
            update.mutate({
              tileId: play.tileId,
              data: { ...(teamId !== undefined ? { teamId } : {}), points: teamId === undefined ? 0 : parsed },
            })
          }
          data-testid={`button-save-play-${play.tileId}`}
          className="bg-[#e9bb4f] px-3 py-1.5 text-xs font-black text-[#14151c] hover:bg-[#f5cf73] disabled:opacity-25"
        >
          حفظ
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => {
            if (window.confirm('حذف نتيجة هذه الخانة وإعادتها إلى اللوحة؟')) restore.mutate({ tileId: play.tileId });
          }}
          data-testid={`button-restore-${play.tileId}`}
          className="mr-2 border border-white/15 px-3 py-1.5 text-xs text-ink-60 hover:text-white disabled:opacity-25"
        >
          إعادة للوحة
        </button>
        {(update.isError || restore.isError) && <span className="mr-2 text-xs text-[#ff9db6]">تعذّر</span>}
      </td>
    </tr>
  );
}
