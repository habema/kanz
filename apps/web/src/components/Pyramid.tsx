import { useEffect, useState } from 'react';
import { AnimatePresence, LayoutGroup, motion } from 'framer-motion';
import type { Branding, GameTeam } from '@kanz/api-client-react';
import { Crown } from 'lucide-react';
import { TeamDot } from '@/components/ui';
import { type RevealStep, number, placeName, rankTeams, revealSteps } from '@/lib/game';

// How long third and second place stay in the spotlight once named; first
// place stays until the admin's final press.
const SPOTLIGHT_MS = 4500;

type Ranked = ReturnType<typeof rankTeams>[number];

// With `step` (presses of the admin's reveal, see revealSteps) every card
// starts sealed and they open from last place up; a top-3 team first takes a
// full-screen spotlight, named on its second press.
export function Pyramid({ teams, branding, step }: { teams: GameTeam[]; branding: Branding; step?: number }) {
  const ranked = rankTeams(teams);
  const reveal = step !== undefined;
  const steps = revealSteps(ranked);
  const opened = new Set(
    reveal ? steps.slice(0, step).flatMap((s) => (s.kind === 'open' || s.kind === 'name' ? [s.position] : [])) : [],
  );
  const spot = useSpotlight(steps, step);
  // Leader on top, then one more card per level (1, 2, 3, 4… up to 6).
  const rows: Ranked[][] = [];
  for (let offset = 0, size = 1; offset < ranked.length; offset += size, size = Math.min(size + 1, 6))
    rows.push(ranked.slice(offset, offset + size));
  let position = 0;
  const slots = rows.map((row) => row.map((entry) => ({ entry, position: position++ })));
  return (
    <div
      className="sky relative flex h-full w-full flex-col overflow-y-auto overflow-x-hidden sm:overflow-hidden"
      dir="rtl"
    >
      <div className="relative z-10 flex items-center justify-between px-[3vw] pt-[2.2vh]">
        <h1 className="pyramid-title text-[clamp(1.4rem,2.6vw,3rem)] font-black">ترتيب الفرق</h1>
        <div className="flex items-center gap-[.6em] text-[clamp(1.1rem,1.8vw,2rem)] font-black text-[#14306b]">
          {branding.media.logo && <img src={branding.media.logo} alt="" className="h-[1.8em] w-auto object-contain" />}
          <span>{branding.title}</span>
        </div>
      </div>
      <LayoutGroup>
        <div className="relative z-10 flex flex-1 flex-col justify-evenly gap-[1.6vh] px-[2vw] pb-14 pt-[1vh] sm:pb-[3vh]">
          {slots.map((row, level) => (
            <div key={level} className="flex flex-wrap justify-center gap-2 sm:flex-nowrap sm:gap-[1.4vw]">
              {row.map(({ entry: { team, rank }, position }) =>
                !reveal ? (
                  <PyramidCard key={team.id} team={team} rank={rank} leader={rank === 1 && team.score > 0} />
                ) : (
                  <RevealSlot
                    key={position}
                    entry={{ team, rank }}
                    open={opened.has(position)}
                    away={spot?.position === position}
                  />
                ),
              )}
            </div>
          ))}
        </div>
      </LayoutGroup>
      {reveal && step >= steps.length && <ConfettiRain gentle />}
      <AnimatePresence>
        {spot && <Spotlight key={ranked[spot.position].team.id} entry={ranked[spot.position]} named={spot.named} />}
      </AnimatePresence>
    </div>
  );
}

// Which position is in the spotlight after the latest press: a top-3 team
// waiting to be named, the champion until the finale, and a newly named
// 3rd/2nd place for a few seconds (not after a reload).
function useSpotlight(steps: RevealStep[], step: number | undefined) {
  // The press whose timed spotlight is over; on mount, the current one.
  const [settled, setSettled] = useState(step);
  useEffect(() => {
    const t = setTimeout(() => setSettled(step), SPOTLIGHT_MS);
    return () => clearTimeout(t);
  }, [step]);
  const last = step ? steps[Math.min(step, steps.length) - 1] : undefined;
  if (!last || last.kind === 'open' || last.kind === 'finale') return null;
  if (last.kind === 'tease') return { position: last.position, named: false };
  if (last.position === 0 || settled !== step) return { position: last.position, named: true };
  return null;
}

function PyramidCard({
  team,
  rank,
  leader,
  reveal,
}: {
  team: GameTeam;
  rank: number;
  leader: boolean;
  reveal?: boolean;
}) {
  return (
    <motion.div
      layout={!reveal}
      layoutId={reveal ? undefined : `team-${team.id}`}
      transition={{ type: 'spring', stiffness: 170, damping: 22 }}
      className={`pyramid-card relative ${reveal ? `w-full ${rank <= 3 ? `pyramid-glow-${rank}` : ''}` : 'w-[calc(50%-.25rem)] sm:w-[clamp(220px,21vw,420px)]'}`}
    >
      {reveal && rank === 1 && (
        <motion.div
          aria-hidden
          className="absolute -top-[6.5vh] left-1/2 -translate-x-1/2"
          initial={{ y: -40, opacity: 0, rotate: -25 }}
          animate={{ y: 0, opacity: 1, rotate: 0 }}
          transition={{ delay: 0.5, type: 'spring', stiffness: 200, damping: 11 }}
        >
          <Crown className="crown h-[7vh] w-[7vh]" />
        </motion.div>
      )}
      <div className="pyramid-name truncate px-3 text-center text-[clamp(.95rem,1.45vw,1.75rem)] font-black">
        <TeamDot color={team.color} className="ml-[.35em]" />
        <bdi>{team.name}</bdi>
      </div>
      <div className="mt-[.6vh] flex gap-[.5vw]">
        <div className="flex min-w-0 flex-1 flex-col gap-[.6vh]">
          <div className="pyramid-rank text-center text-[clamp(.75rem,1.05vw,1.25rem)] font-black">
            {placeName(rank)}
          </div>
          <motion.div
            key={team.score}
            initial={{ scale: 1.12, filter: 'brightness(1.6)' }}
            animate={{ scale: 1, filter: 'brightness(1)' }}
            transition={{ duration: 0.6 }}
            className={`pyramid-score text-center tabular-nums text-[clamp(1.1rem,1.9vw,2.3rem)] font-bold ${leader ? 'pyramid-score-lead' : ''}`}
          >
            {number(team.score)}
          </motion.div>
        </div>
        <div
          className={`pyramid-badge grid aspect-square w-[34%] shrink-0 place-items-center text-[clamp(1.6rem,3.2vw,3.8rem)] font-black ${rank <= 3 ? `medal-${rank}` : ''}`}
        >
          {number(rank)}
        </div>
      </div>
    </motion.div>
  );
}

// One pyramid position during the reveal: a sealed card that flips open.
// While its team is in the spotlight the slot keeps its space but stays empty.
function RevealSlot({ entry: { team, rank }, open, away }: { entry: Ranked; open: boolean; away: boolean }) {
  const medal = rank <= 3;
  return (
    <div className="relative w-[calc(50%-.25rem)] [perspective:900px] sm:w-[clamp(220px,21vw,420px)]">
      <AnimatePresence mode="wait" initial={false}>
        {away ? (
          <div key="away" className="invisible">
            <SealedCard rank={rank} />
          </div>
        ) : !open ? (
          <motion.div
            key="sealed"
            initial={{ rotateY: -90 }}
            animate={{ rotateY: 0 }}
            exit={{ rotateY: 90, opacity: 0.6 }}
            transition={{ duration: 0.22, ease: 'easeIn' }}
          >
            <SealedCard rank={rank} />
          </motion.div>
        ) : (
          <motion.div
            key={`open-${team.id}`}
            className="relative"
            initial={medal ? { scale: 1.5, opacity: 0, y: -30 } : { rotateY: -90 }}
            animate={medal ? { scale: 1, opacity: 1, y: 0 } : { rotateY: 0 }}
            exit={{ rotateY: 90, opacity: 0, transition: { duration: 0.22, ease: 'easeIn' } }}
            transition={
              medal ? { type: 'spring', stiffness: 160, damping: 13 } : { type: 'spring', stiffness: 220, damping: 18 }
            }
          >
            <PyramidCard team={team} rank={rank} leader={rank === 1 && team.score > 0} reveal />
            {!medal && (
              <motion.span
                aria-hidden
                className="pointer-events-none absolute inset-0 bg-white"
                initial={{ opacity: 0.8 }}
                animate={{ opacity: 0 }}
                transition={{ duration: 0.7 }}
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SealedCard({ rank }: { rank: number }) {
  return (
    <div className="pyramid-card pyramid-sealed w-full">
      <div className="pyramid-name pyramid-name-sealed px-3 text-center text-[clamp(.95rem,1.45vw,1.75rem)] font-black">
        ؟ ؟ ؟
      </div>
      <div className="mt-[.6vh] flex gap-[.5vw]">
        <div className="flex min-w-0 flex-1 flex-col gap-[.6vh]">
          <div className="pyramid-rank text-center text-[clamp(.75rem,1.05vw,1.25rem)] font-black">
            {placeName(rank)}
          </div>
          <div className="pyramid-score text-center text-[clamp(1.1rem,1.9vw,2.3rem)] font-bold">؟</div>
        </div>
        <div className="pyramid-badge grid aspect-square w-[34%] shrink-0 place-items-center text-[clamp(1.6rem,3.2vw,3.8rem)] font-black">
          ؟
        </div>
      </div>
    </div>
  );
}

// Full-screen moment for a top-3 team: medal-coloured rays, the place and a
// pulsing "؟ ؟ ؟" while the drumroll plays; once named, a flash, the name and
// score, a burst (the champion: crown and confetti rain).
function Spotlight({ entry: { team, rank }, named }: { entry: Ranked; named: boolean }) {
  const champion = rank === 1;
  return (
    <motion.div
      className={`spotlight-${rank} absolute inset-0 z-30 grid place-items-center overflow-hidden`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
    >
      <motion.div
        className={`rays rays-medal-${rank}`}
        animate={{ rotate: 360 }}
        transition={{ duration: champion ? 14 : 24, ease: 'linear', repeat: Infinity }}
      />
      {named && (champion ? <ConfettiRain /> : <MedalBurst rank={rank} />)}
      {named && (
        <motion.span
          aria-hidden
          className="pointer-events-none absolute inset-0 z-40 bg-white"
          initial={{ opacity: 0.85 }}
          animate={{ opacity: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      )}
      <motion.div
        className="relative z-30 flex flex-col items-center px-[4vw] text-center"
        exit={{ scale: 0.35, y: '-30vh', opacity: 0 }}
        transition={{ duration: 0.55, ease: 'easeIn' }}
      >
        <motion.p
          className={`spotlight-place-${rank} text-[clamp(1.6rem,3.6vw,4.4rem)] font-black`}
          initial={{ y: -30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          {placeName(rank)}
        </motion.p>
        <div className={`relative ${champion ? 'mt-[11vh]' : 'mt-[3vh]'}`}>
          {champion && named && (
            <motion.div
              aria-hidden
              className="absolute -top-[12.5vh] left-1/2 -translate-x-1/2"
              initial={{ y: '-60vh', rotate: -40 }}
              animate={{ y: 0, rotate: [-40, 12, -6, 0] }}
              transition={{ delay: 0.4, duration: 0.9, ease: 'easeOut' }}
            >
              <Crown className="crown h-[14vh] w-[14vh]" />
            </motion.div>
          )}
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: 0.45, duration: 0.8, ease: 'easeOut' }}
          >
            <motion.div
              key={named ? 'named' : 'waiting'}
              className={`spotlight-medal medal-${rank} grid h-[24vh] w-[24vh] place-items-center text-[12vh] font-black`}
              animate={named ? { scale: [1, 1.25, 1] } : { scale: [1, 1.06, 1] }}
              transition={named ? { duration: 0.6 } : { duration: 0.9, repeat: Infinity, ease: 'easeInOut' }}
            >
              {number(rank)}
            </motion.div>
          </motion.div>
        </div>
        <div className="mt-[4vh] grid min-h-[1.3em] place-items-center text-[clamp(3rem,8vw,9rem)] font-black leading-tight">
          <AnimatePresence mode="wait" initial={false}>
            {named ? (
              <motion.h2
                key="name"
                className="spotlight-name max-w-[90vw] truncate"
                initial={{ scale: 2.2, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 200, damping: 14 }}
              >
                <TeamDot color={team.color} className="ml-[.3em] !h-[.4em] !w-[.4em]" />
                <bdi>{team.name}</bdi>
              </motion.h2>
            ) : (
              <motion.p
                key="hidden"
                className="spotlight-name tracking-[.3em]"
                initial={{ opacity: 0 }}
                animate={{ opacity: [0.3, 0.85, 0.3] }}
                exit={{ opacity: 0, scale: 0.7, transition: { duration: 0.15 } }}
                transition={{ delay: 1, duration: 1.2, repeat: Infinity }}
              >
                ؟ ؟ ؟
              </motion.p>
            )}
          </AnimatePresence>
        </div>
        <motion.p
          className="mt-[2vh] min-h-[1.3em] tabular-nums text-[clamp(1.4rem,3vw,3.6rem)] font-black text-white"
          initial={false}
          animate={{ y: named ? 0 : 20, opacity: named ? 1 : 0 }}
          transition={{ delay: named ? 0.5 : 0 }}
        >
          {named ? `${number(team.score)} نقطة` : ''}
        </motion.p>
      </motion.div>
    </motion.div>
  );
}

const MEDAL_COLORS: Record<number, string[]> = {
  2: ['#ffffff', '#dfe4ea', '#aab2bd', '#8fd3ff'],
  3: ['#f0b27a', '#ffd2a6', '#c9793a', '#ffe7c7'],
};
const BURST = Array.from({ length: 30 }, (_, i) => ({
  angle: (i / 30) * Math.PI * 2,
  dist: 30 + (i % 5) * 8,
  d: (i % 6) * 0.04,
}));
function MedalBurst({ rank }: { rank: number }) {
  const colors = MEDAL_COLORS[rank] ?? MEDAL_COLORS[3];
  return (
    <>
      {BURST.map((p, i) => (
        <motion.span
          key={i}
          aria-hidden
          className="confetti"
          style={{ background: colors[i % colors.length] }}
          initial={{ x: 0, y: 0, opacity: 0 }}
          animate={{
            x: `${Math.cos(p.angle) * p.dist}vw`,
            y: `${Math.sin(p.angle) * p.dist}vh`,
            opacity: [0, 1, 1, 0],
            rotate: 540,
          }}
          transition={{ duration: 2, delay: 0.1 + p.d, ease: 'easeOut' }}
        />
      ))}
    </>
  );
}

const RAIN_COLORS = ['#ffd23f', '#ff4f8b', '#3ec6ff', '#7cff6b', '#ffffff', '#f2c75d'];
const RAIN = Array.from({ length: 70 }, (_, i) => ({
  x: (i * 37 + 7) % 100,
  d: (i % 14) * 0.28,
  dur: 3.2 + (i % 5) * 0.7,
  spin: i % 2 ? 720 : -720,
  w: 10 + (i % 3) * 4,
}));
function ConfettiRain({ gentle }: { gentle?: boolean }) {
  const pieces = gentle ? RAIN.filter((_, i) => i % 3 === 0) : RAIN;
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-20 overflow-hidden">
      {pieces.map((p, i) => (
        <motion.span
          key={i}
          className="absolute top-0 rounded-[2px]"
          style={{ left: `${p.x}%`, width: p.w, height: p.w * 1.6, background: RAIN_COLORS[i % RAIN_COLORS.length] }}
          initial={{ y: '-10vh', rotate: 0 }}
          animate={{ y: '110vh', rotate: p.spin, x: [0, 30, -30, 0] }}
          transition={{ duration: gentle ? p.dur * 1.6 : p.dur, delay: p.d, ease: 'linear', repeat: Infinity }}
        />
      ))}
    </div>
  );
}
