import { useMemo } from 'react';
import { evenTileCounts, generateSchedule, summarizeSchedule, totalTiles, type GameConfig } from '@kanz/game-core';
import { Plus, Shuffle, Trash2 } from 'lucide-react';
import { Segmented, TeamDot, input, outlineButton } from '@/components/ui';
import { number } from '@/lib/game';
import { IconButton, Warning, useRowKeys, type SectionProps } from './shared';

// Keeps an enabled schedule in step with the board: when the number of tiles
// or teams changes, the rounds are drawn again.
export function withSchedule(previous: GameConfig, config: GameConfig): GameConfig {
  if (!config.rounds.length || config.teams.length < 2) return config;
  const tiles = totalTiles(config);
  if (tiles === 0) return config;
  const fits =
    config.teams.length === previous.teams.length &&
    config.rounds.length === tiles &&
    config.rounds.every((r) => r.every((t) => t <= config.teams.length));
  return fits ? config : { ...config, rounds: generateSchedule(config.teams.length, tiles) };
}

const PALETTE = [
  '#e53935',
  '#1e5bc6',
  '#2e9e44',
  '#c8a04e',
  '#8e44ad',
  '#f08c2e',
  '#cc7f9f',
  '#00897b',
  '#1c1c20',
  '#f6f6f4',
  '#8fe08a',
  '#6d4c41',
];
const defaultTeam = (index: number) => ({
  name: `الفريق ${number(index + 1)}`,
  color: PALETTE[index % PALETTE.length],
});

export function TeamsSection({ draft, update, locked }: SectionProps) {
  const teams = draft.teams;
  const rows = useRowKeys(teams.length);
  const set = (i: number, patch: Partial<GameConfig['teams'][number]>) =>
    update({ teams: teams.map((t, j) => (j === i ? { ...t, ...patch } : t)) });
  return (
    <section className="panel-bevel mx-auto w-full max-w-3xl p-5">
      <h2 className="text-lg font-black">الفرق</h2>
      <p className="mt-1 text-xs leading-6 text-ink-50">فريقان على الأقل.</p>
      <div className="mt-4 grid gap-2">
        {teams.map((team, i) => (
          <div key={rows.keys[i]} className="flex items-center gap-2">
            <span className="w-6 text-center text-xs tabular-nums text-ink-40">{number(i + 1)}</span>
            <input
              type="color"
              value={team.color}
              onChange={(e) => set(i, { color: e.target.value })}
              aria-label={`لون الفريق ${i + 1}`}
              className="h-9 w-11 cursor-pointer border border-white/15 bg-transparent p-0.5"
            />
            <input
              value={team.name}
              maxLength={40}
              onChange={(e) => set(i, { name: e.target.value })}
              aria-label={`اسم الفريق ${i + 1}`}
              data-testid={`input-setup-team-${i + 1}`}
              className={`${input} min-w-0 flex-1`}
            />
            <IconButton
              title="حذف الفريق"
              disabled={locked}
              onClick={() => {
                rows.remove(i);
                update({ teams: teams.filter((_, j) => j !== i) });
              }}
            >
              <Trash2 size={14} />
            </IconButton>
          </div>
        ))}
      </div>
      <button
        type="button"
        disabled={locked}
        onClick={() => {
          rows.add();
          update({ teams: [...teams, defaultTeam(teams.length)] });
        }}
        className="mt-4 flex items-center gap-2 text-sm font-bold text-ink-60 hover:text-white disabled:opacity-40"
        data-testid="button-add-team"
      >
        <Plus size={16} /> إضافة فريق
      </button>
    </section>
  );
}

// ---------------------------------------------------------------- rounds

export function ScheduleSection({ draft, update }: SectionProps) {
  const tiles = totalTiles(draft);
  const teams = draft.teams;
  const on = draft.rounds.length > 0;
  const can = teams.length >= 2 && tiles > 0;
  const generate = () => update({ rounds: generateSchedule(teams.length, tiles) });
  const summary = useMemo(
    () => (on ? summarizeSchedule(teams.length, draft.rounds) : null),
    [on, teams.length, draft.rounds],
  );
  const even = evenTileCounts(teams.length, tiles);
  const team = (id: number) => teams[id - 1];
  const range = ([a, b]: [number, number]) => (a === b ? number(a) : `${number(a)}–${number(b)}`);
  return (
    <div className="mx-auto grid w-full max-w-5xl gap-6">
      <section className="panel-bevel p-5">
        <h2 className="text-lg font-black">جدول الجولات</h2>
        <p className="mt-1 text-xs leading-6 text-ink-50">
          {on
            ? `كل خانة جولة بين فريقين، يختار أولهما السؤال (${number(tiles)} جولة). يُوزَّع اللعب بالتساوي.`
            : 'يختار المقدم الخانات بحرية ويمنح النقاط لأي فريق.'}
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Segmented
            label="الجدول"
            value={on ? 'on' : 'off'}
            onSelect={(v) => {
              if (v === 'off') update({ rounds: [] });
              else if (!on) generate();
            }}
            options={[
              { value: 'on', label: 'بجدول', disabled: !can, testId: 'button-generate-rounds' },
              { value: 'off', label: 'بلا جدول', testId: 'button-no-rounds' },
            ]}
          />
          {on && (
            <button type="button" onClick={generate} className={outlineButton}>
              <Shuffle size={14} /> سحب جديد
            </button>
          )}
        </div>
        {!can && <p className="mt-3 text-xs text-ink-45">يحتاج فريقين وخانة على الأقل.</p>}
        {summary && (
          <div className="mt-4 grid gap-2 text-sm">
            <p className="text-ink-75">
              يلعب كل فريق {range(summary.plays)} جولة ويختار {range(summary.picks)} مرة، ويلتقي كل فريقين{' '}
              {range(summary.meetings)} مرة.
            </p>
            {summary.idle > 0 && <Warning>{number(summary.idle)} فرق لن تلعب: أضف خانات أو قلّل الفرق.</Warning>}
            {summary.idle === 0 && summary.plays[0] !== summary.plays[1] && (
              <Warning>
                بعض الفرق تلعب جولة أكثر.
                {even.length > 0 && ` للتساوي اجعل الخانات ${even.map((n) => number(n)).join(' أو ')}.`}
              </Warning>
            )}
            {summary.idle === 0 && summary.meetings[0] === 0 && (
              <p className="text-xs text-ink-45">
                لن يلتقي كل فريقين ({number(summary.met)} من {number(summary.pairs)} مواجهة).
              </p>
            )}
            {summary.backToBack > 0 && (
              <p className="text-xs text-ink-45">جولات متتالية لا مفر منها: {number(summary.backToBack)}.</p>
            )}
          </div>
        )}
      </section>
      {on && (
        <>
          <section className="panel-bevel p-5">
            <h3 className="mb-3 text-sm font-black">لكل فريق</h3>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {teams.map((t, i) => (
                <p key={i} className="flex items-center gap-2 text-sm">
                  <TeamDot color={t.color} />
                  <span className="min-w-0 flex-1 truncate font-bold">
                    <bdi>{t.name}</bdi>
                  </span>
                  <span className="tabular-nums text-xs text-ink-50">
                    {number(draft.rounds.filter((r) => r.includes(i + 1)).length)} جولة · يختار{' '}
                    {number(draft.rounds.filter((r) => r[0] === i + 1).length)}
                  </span>
                </p>
              ))}
            </div>
          </section>
          <section className="panel-bevel p-5">
            <ol className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
              {draft.rounds.map(([picker, opponent], i) => (
                <li
                  key={i}
                  className="flex min-w-0 items-center gap-2 border border-white/10 bg-black/15 px-3 py-1.5 text-sm"
                >
                  <span className="w-7 shrink-0 tabular-nums text-xs text-ink-40">{number(i + 1)}</span>
                  {team(picker) && <TeamDot color={team(picker).color} />}
                  <span className="min-w-0 truncate font-bold text-[#f2c75d]">
                    <bdi>{team(picker)?.name ?? '؟'}</bdi>
                  </span>
                  <span className="shrink-0 text-xs text-ink-40">ضد</span>
                  {team(opponent) && <TeamDot color={team(opponent).color} />}
                  <span className="min-w-0 truncate">
                    <bdi>{team(opponent)?.name ?? '؟'}</bdi>
                  </span>
                </li>
              ))}
            </ol>
          </section>
        </>
      )}
    </div>
  );
}
