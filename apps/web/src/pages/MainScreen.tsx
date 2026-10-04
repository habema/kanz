import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useGetPublicGame, getGetPublicGameQueryKey } from '@kanz/api-client-react';
import type { CurrentTile, Game, GameCategory, GameTeam, Match } from '@kanz/api-client-react';
import { Activity, Check, Gem, Hand, PartyPopper, Volume2, VolumeX, X } from 'lucide-react';
import { Link } from 'wouter';
import { Pyramid } from '@/components/Pyramid';
import { Logo, TeamDot, TeamDotFor, goldButton } from '@/components/ui';
import {
  playClip,
  playCue,
  playIntroMusic,
  playQuestionSting,
  setBackgroundMusic,
  setSoundOverrides,
  setSuspense,
  soundUrl,
  stopAllAudio,
  stopIntroMusic,
  trackForeground,
  unlockAudio,
} from '@/lib/audio';
import { number, rankTeams, revealSteps, splitChallenge, teamName, useDocumentTitle } from '@/lib/game';
import { mediaUrl, resolveMedia, type Celebration } from '@/lib/media';

const BANNER_MS = 4500;

// The audience screen. It is purely reactive: everything on it is driven by
// the admin through the server state.
export function MainScreen() {
  const query = useGetPublicGame({
    query: { queryKey: getGetPublicGameQueryKey(), refetchInterval: 700, refetchIntervalInBackground: true },
  });
  const game = query.data;
  const [sound, setSound] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [banner, setBanner] = useState<{ key: number; team: GameTeam; points: number } | null>(null);
  // The tile whose suspense loop the admin silenced with the soundboard's stop.
  const [hushed, setHushed] = useState<string | null>(null);
  const seenEvent = useRef<number | undefined>(undefined);
  const seenSound = useRef<number | undefined>(undefined);
  const seenReveal = useRef<number | undefined>(undefined);

  // React to new events only; a reload does not replay sounds.
  useEffect(() => {
    if (!game) return;
    const event = game.event;
    if (seenEvent.current === undefined) {
      seenEvent.current = event.id;
      return;
    }
    if (seenEvent.current === event.id) return;
    seenEvent.current = event.id;
    const current = game.current;
    // A celebration video brings its own sound (see CelebrationVideo).
    const kind = current?.kind === 'kashkool' ? 'kashkool' : 'kanz';
    if (event.type === 'opened' && current && game.intro && resolveMedia(game.branding.media)[kind].mode === 'image') {
      void playIntroMusic(kind).then((ok) => {
        if (!ok) setBlocked(true);
      });
    }
    if (event.type === 'opened' && current && !game.intro) {
      void playQuestionSting().then((ok) => {
        if (!ok) setBlocked(true);
      });
    }
    if (event.type === 'answer' && game.answerState === 'shown') {
      if (game.answerVerdict)
        void playClip(soundUrl(game.answerVerdict)).then((ok) => {
          if (!ok) setBlocked(true);
        });
      else if (sound) playCue('reveal');
    }
    if (event.type === 'finished' && event.teamId) {
      const team = game.teams.find((t) => t.id === event.teamId);
      if (team) {
        setBanner({ key: event.id, team, points: event.points ?? 0 });
        if (sound) playCue('award');
      }
    }
  }, [game, sound]);
  // Soundboard presses from the admin; a reload does not replay the last one.
  useEffect(() => {
    if (!game) return;
    const { id, name, url } = game.sound;
    const first = seenSound.current === undefined;
    if (seenSound.current === id) return;
    seenSound.current = id;
    if (first) return;
    if (name === 'stop') {
      stopIntroMusic();
      void playClip(undefined);
      if (game.current) setHushed(game.current.id);
    } else if (url)
      void playClip(mediaUrl(url)).then((ok) => {
        if (!ok) setBlocked(true);
      });
  }, [game]);
  // Each press of the leaderboard reveal gets a sound: a whoosh per card, a
  // drumroll while a top-3 spotlight waits, clapping when 3rd/2nd is named,
  // the fanfare for the champion and applause at the end.
  useEffect(() => {
    if (!game) return;
    const step = game.view === 'reveal' ? (game.revealStep ?? 0) : undefined;
    const before = seenReveal.current;
    seenReveal.current = step;
    if (step === undefined || before === undefined || step <= before || step === 0) return;
    const ranked = rankTeams(game.teams);
    const now = revealSteps(ranked)[step - 1];
    if (!now) return;
    const name =
      now.kind === 'finale'
        ? 'applause'
        : now.kind === 'open'
          ? 'whoosh'
          : now.kind === 'tease'
            ? 'drumroll'
            : ranked[now.position].rank === 1
              ? 'fanfare'
              : 'clapping';
    void playClip(soundUrl(name)).then((ok) => {
      if (!ok) setBlocked(true);
    });
  }, [game]);
  // Browsers only allow audio after a click, so any click on the screen turns sound on.
  useEffect(() => {
    const enable = () => {
      unlockAudio();
      setSound(true);
      setBlocked(false);
    };
    window.addEventListener('pointerdown', enable);
    return () => window.removeEventListener('pointerdown', enable);
  }, []);
  // The celebration (and its music) runs until the admin ends it or closes the tile.
  const introOn = !!game?.current && game.intro;
  useEffect(() => {
    if (!introOn) stopIntroMusic();
  }, [introOn]);
  // Suspense runs under every open tile (after the celebration, if any) until
  // the answer is on screen or the tile closes.
  const suspenseOn = !!game?.current && !game.intro && game.answerState !== 'shown' && hushed !== game.current.id;
  useEffect(() => {
    setSuspense(suspenseOn);
  }, [suspenseOn]);
  useEffect(() => stopAllAudio, []);
  // No background music until onboarding has saved a game.
  const music = game?.configured ? game.music : undefined;
  const track = resolveMedia(game?.branding.media).music;
  useEffect(() => {
    if (music) setBackgroundMusic(music, track, () => setBlocked(true));
  }, [music, track]);
  // Query results keep their identity while unchanged, so this runs on edits only.
  const sounds = game?.branding.media.sounds;
  useEffect(() => {
    setSoundOverrides(sounds);
  }, [sounds]);
  useDocumentTitle(game?.branding);
  useEffect(() => {
    if (!banner) return;
    const t = setTimeout(() => setBanner(null), BANNER_MS);
    return () => clearTimeout(t);
  }, [banner]);

  if (!game)
    return (
      <div className="grid h-[100dvh] place-items-center bg-[#10121a] text-ink-40">
        {query.isError ? 'تعذّر الاتصال بالخادم… تتم إعادة المحاولة' : 'جارٍ التحميل…'}
      </div>
    );
  if (!game.configured) return <SetupNeeded />;
  const current = game.current;
  return (
    <div className="grain relative h-[100dvh] overflow-hidden bg-[#10121a] text-[#f3f0e7]" dir="rtl">
      <AnimatePresence mode="wait">
        {game.view !== 'board' && !current ? (
          <motion.div
            key={game.view}
            className="absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Pyramid
              teams={game.teams}
              branding={game.branding}
              step={game.view === 'reveal' ? (game.revealStep ?? 0) : undefined}
            />
          </motion.div>
        ) : (
          <motion.div
            key="board"
            className="absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Board game={game} />
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {current &&
          (game.intro ? (
            <Intro key={`intro-${current.id}`} tile={current} game={game} onBlocked={() => setBlocked(true)} />
          ) : (
            <QuestionCard
              key={`card-${current.id}`}
              tile={current}
              answerShown={game.answerState === 'shown'}
              game={game}
            />
          ))}
      </AnimatePresence>
      <AnimatePresence>
        {banner && !current && <AwardBanner key={banner.key} team={banner.team} points={banner.points} />}
      </AnimatePresence>
      {blocked && (
        <div className="absolute bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 border-2 border-[#f2c75d] bg-[#14151c] px-6 py-3 text-lg font-black text-[#f2c75d]">
          <Volume2 size={20} /> انقر في أي مكان لتفعيل الصوت
        </div>
      )}
      <button
        aria-label={sound ? 'كتم نغمة منح النقاط' : 'تشغيل نغمة منح النقاط'}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={() => {
          if (!sound) unlockAudio();
          setSound((v) => !v);
        }}
        data-testid="button-sound-toggle"
        className="absolute bottom-3 left-3 z-50 grid h-8 w-8 place-items-center text-white/25 transition hover:text-white/70"
      >
        {sound ? <Volume2 size={16} /> : <VolumeX size={16} />}
      </button>
    </div>
  );
}

// The first-run welcome: every page leads here until onboarding saves a game.
// The screen keeps polling and shows the board once that happens.
function SetupNeeded() {
  return (
    <div className="grain grid h-[100dvh] place-items-center bg-[#10121a] p-6 text-[#f3f0e7]" dir="rtl">
      <div className="stage-shell max-w-2xl border border-white/10 border-t-2 border-t-[#e9bb4f] p-[clamp(1.5rem,4vw,3.5rem)] text-center shadow-[0_24px_80px_#0008]">
        <Logo className="mx-auto h-16" />
        <h1 className="mt-6 text-[clamp(1.8rem,3.4vw,3rem)] font-black text-[#f2c75d]">أهلاً بك في كنز</h1>
        <p className="mt-3 text-[clamp(.95rem,1.3vw,1.2rem)] leading-8 text-ink-60">
          لنجهّز مسابقتك في خطوات قصيرة، وكل شيء قابل للتعديل لاحقاً.
        </p>
        <Link
          href="/setup"
          className={`${goldButton} mx-auto mt-8 w-fit px-8 py-4 text-lg`}
          data-testid="link-start-setup"
        >
          ابدأ الإعداد
        </Link>
      </div>
    </div>
  );
}

function Board({ game }: { game: Game }) {
  const tiles = game.categories.flatMap((c) => c.tiles);
  const left = tiles.filter((t) => !t.used).length;
  return (
    <div className="flex h-full flex-col p-[1.4vw]">
      <div className="stage-frame stage-shell entry flex min-h-0 flex-1 flex-col overflow-hidden">
        <header className="flex items-center justify-between gap-[2vw] border-b-[3px] border-[#73777c] bg-[#101219] px-[2vw] py-[1.6vh]">
          <div className="flex shrink-0 items-center gap-[1vw]">
            <Logo media={game.branding.media} className="h-[clamp(2.4rem,4.2vw,4.6rem)] max-w-[16vw]" />
            <h1 className="text-[clamp(1.5rem,2.8vw,3.2rem)] font-black leading-tight text-[#f2c75d]">
              {game.branding.title}
            </h1>
          </div>
          <MatchStrip match={game.match} teams={game.teams} />
        </header>
        <div
          className="grid min-h-0 flex-1 gap-[1.6vw] px-[2vw] py-[2.2vh]"
          style={{ gridTemplateColumns: `repeat(${game.categories.length}, minmax(0, 1fr))` }}
        >
          {game.categories.map((category, ci) => (
            <CategoryColumn key={category.id} category={category} index={ci} />
          ))}
        </div>
        {/* Extra left padding keeps the count clear of the sound toggle. */}
        <footer className="flex items-center justify-between gap-4 border-t border-white/10 py-[1.2vh] pl-[max(2vw,3.5rem)] pr-[2vw] text-[clamp(.7rem,1vw,1.1rem)] font-bold text-ink-40">
          <span>
            {game.branding.title}
            {game.branding.subtitle && ` · ${game.branding.subtitle}`}
          </span>
          <span className="flex items-center gap-2">
            <Activity className="h-[1.1em] w-[1.1em] text-[#53cec4]" />
            <span className="tabular-nums text-[#f2c75d]">{number(left)}</span> خانة متبقية من {number(tiles.length)}
          </span>
        </footer>
      </div>
    </div>
  );
}

// Which two teams play this round, who picks the tile, and who is up next.
function MatchStrip({ match, teams }: { match: Match; teams: GameTeam[] }) {
  const current = match.current;
  if (!current) return null;
  return (
    <div data-testid="match-strip" className="flex min-w-0 flex-col items-end gap-[.8vh]">
      <div className="flex min-w-0 items-center gap-[.7vw] text-[clamp(1rem,1.7vw,2rem)] font-black">
        <span className="shrink-0 text-[.55em] tracking-[.1em] text-[#53cec4]">
          الجولة {number(match.round)} من {number(match.total)}
        </span>
        <span className="flex min-w-0 items-center gap-2 border-2 border-[#f2c75d] bg-[#e9bb4f]/15 px-[.7em] py-[.15em] text-[#f2c75d]">
          <Hand className="h-[.9em] w-[.9em] shrink-0" />
          <TeamDotFor teams={teams} id={current.picker} className="mx-[.3em]" />
          <span className="truncate">
            <bdi>{teamName(teams, current.picker)}</bdi>
          </span>
        </span>
        <span className="shrink-0 text-[.6em] text-ink-45">ضد</span>
        <span className="flex min-w-0 items-center border-2 border-white/20 px-[.7em] py-[.15em]">
          <TeamDotFor teams={teams} id={current.opponent} className="mx-[.3em]" />
          <span className="truncate">
            <bdi>{teamName(teams, current.opponent)}</bdi>
          </span>
        </span>
      </div>
      {match.next && (
        <p className="min-w-0 truncate text-[clamp(.75rem,1.05vw,1.2rem)] font-bold text-ink-40">
          التالي: <TeamDotFor teams={teams} id={match.next.picker} className="mx-[.3em]" />
          <span className="text-ink-70">
            <bdi>{teamName(teams, match.next.picker)}</bdi>
          </span>{' '}
          ضد <TeamDotFor teams={teams} id={match.next.opponent} className="mx-[.3em]" />
          <span className="text-ink-70">
            <bdi>{teamName(teams, match.next.opponent)}</bdi>
          </span>
        </p>
      )}
    </div>
  );
}

function CategoryColumn({ category, index }: { category: GameCategory; index: number }) {
  return (
    <section className="entry flex min-h-0 flex-col" style={{ animationDelay: `${index * 70}ms` }}>
      <div className="category-head mb-[1.4vh] grid min-h-[9vh] place-items-center px-2 text-center text-[clamp(1.1rem,1.9vw,2.2rem)] font-black">
        {category.title}
      </div>
      <div
        className="grid min-h-0 flex-1 grid-cols-3 gap-[.8vw]"
        style={{ gridTemplateRows: `repeat(${Math.max(1, Math.ceil(category.tiles.length / 3))}, minmax(0, 1fr))` }}
      >
        {category.tiles.map((tile) => (
          <div
            key={tile.id}
            data-testid={`tile-${tile.id}`}
            className={`bevel-tile grid place-items-center tabular-nums text-[clamp(1.1rem,2.1vw,2.6rem)] font-bold transition-opacity duration-500 ${tile.used ? 'opacity-0' : ''}`}
          >
            {number(tile.value)}
          </div>
        ))}
      </div>
    </section>
  );
}

function QuestionCard({ tile, answerShown, game }: { tile: CurrentTile; answerShown: boolean; game: Game }) {
  const kashkool = tile.kind === 'kashkool';
  const challenge = kashkool ? splitChallenge(tile.prompt) : null;
  const tone = kashkool ? 'card-kashkool' : tile.kanz ? 'card-kanz' : '';
  return (
    <motion.div
      className="absolute inset-0 z-30 flex items-center justify-center bg-[#05060bd9] p-[4vw] backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      role="dialog"
      aria-modal="true"
      aria-label="السؤال الحالي"
    >
      <motion.section
        initial={{ scale: 0.92, y: 30 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 160, damping: 20 }}
        className={`question-card stage-shell relative w-full max-w-[1500px] p-[3.5vw] ${tone}`}
      >
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-[2vh]">
          <span className="text-[clamp(1rem,1.6vw,1.9rem)] font-black text-ink-70">
            {tile.category}
            {game.match.current && (
              <span className="mr-3 text-[.8em] text-ink-45">
                · <TeamDotFor teams={game.teams} id={game.match.current.picker} className="mx-[.3em]" />
                <bdi>{teamName(game.teams, game.match.current.picker)}</bdi> ضد{' '}
                <TeamDotFor teams={game.teams} id={game.match.current.opponent} className="mx-[.3em]" />
                <bdi>{teamName(game.teams, game.match.current.opponent)}</bdi>
              </span>
            )}
          </span>
          <div className="flex items-center gap-3">
            {kashkool && (
              <span className="pill pill-kashkool">
                <PartyPopper className="h-[1em] w-[1em]" /> كشكول
              </span>
            )}
            {tile.kanz && (
              <span className="pill pill-kanz">
                <Gem className="h-[1em] w-[1em]" /> كنز ×{number(game.branding.kanzMultiplier)}
              </span>
            )}
            <span className="pill pill-gold tabular-nums">{number(tile.points)} نقطة</span>
          </div>
        </div>
        {challenge ? (
          <div className="mt-[4vh]">
            <h2 className="text-[clamp(2rem,4.2vw,5rem)] font-black leading-snug text-[#ffd0e1]">{challenge.title}</h2>
            {challenge.detail && (
              <p className="mt-[3vh] text-[clamp(1.4rem,2.6vw,3.2rem)] font-bold leading-relaxed">{challenge.detail}</p>
            )}
          </div>
        ) : (
          <h2 className="mt-[4vh] text-[clamp(2rem,4.2vw,5rem)] font-black leading-snug">{tile.prompt}</h2>
        )}
        <AnimatePresence>
          {answerShown && tile.answer && <AnswerReveal answer={tile.answer} verdict={game.answerVerdict} />}
        </AnimatePresence>
      </motion.section>
    </motion.div>
  );
}

const VERDICTS = {
  correct: { box: 'border-[#3ed598] bg-[#3ed598]/15', label: 'text-[#7ff0bf]', title: 'إجابة صحيحة', flash: '#3ed598' },
  wrong: {
    box: 'border-[#ff5c7a] bg-[#ff5c7a]/12',
    label: 'text-[#ffadc2]',
    title: 'الإجابة الصحيحة',
    flash: '#ff5c7a',
  },
};
// Correct answers pop in with a green burst; wrong ones shake in red; a plain
// reveal slides up in teal.
function AnswerReveal({ answer, verdict }: { answer: string; verdict?: 'correct' | 'wrong' }) {
  const look = verdict ? VERDICTS[verdict] : undefined;
  return (
    <motion.div
      initial={
        verdict === 'correct'
          ? { opacity: 0, scale: 0.6 }
          : verdict === 'wrong'
            ? { opacity: 0 }
            : { opacity: 0, y: 24, scale: 0.96 }
      }
      animate={
        verdict === 'correct'
          ? { opacity: 1, scale: [0.6, 1.08, 1] }
          : verdict === 'wrong'
            ? { opacity: 1, x: [0, -28, 24, -18, 12, -6, 0] }
            : { opacity: 1, y: 0, scale: 1 }
      }
      transition={verdict ? { duration: 0.6, ease: 'easeOut' } : { type: 'spring', stiffness: 200, damping: 18 }}
      className={`relative mt-[5vh] border-2 px-[2vw] py-[2.5vh] ${look?.box ?? 'border-[#53cec4]/70 bg-[#53cec4]/10'}`}
    >
      {look && (
        <motion.span
          aria-hidden
          className="pointer-events-none absolute inset-0 border-4"
          style={{ borderColor: look.flash }}
          initial={{ opacity: 0.9, scale: 1 }}
          animate={{ opacity: 0, scale: verdict === 'correct' ? 1.12 : 1.04 }}
          transition={{ duration: 0.9, delay: 0.25, ease: 'easeOut' }}
        />
      )}
      <p
        className={`flex items-center gap-2 text-[clamp(.8rem,1.1vw,1.3rem)] font-black tracking-[.17em] ${look?.label ?? 'text-[#53cec4]'}`}
      >
        {verdict === 'correct' && <Check className="h-[1.4em] w-[1.4em]" />}
        {verdict === 'wrong' && <X className="h-[1.4em] w-[1.4em]" />}
        {look?.title ?? 'الإجابة'}
      </p>
      <p className="mt-2 text-[clamp(1.8rem,3.4vw,4.2rem)] font-black">{answer}</p>
    </motion.div>
  );
}

// Full-screen surprise shown when a كنز or كشكول tile opens. It loops until
// the admin ends it; in video mode the video plays over it first.
function Intro({ tile, game, onBlocked }: { tile: CurrentTile; game: Game; onBlocked: () => void }) {
  const kashkool = tile.kind === 'kashkool';
  const celebration = resolveMedia(game.branding.media)[kashkool ? 'kashkool' : 'kanz'];
  return (
    <motion.div
      className={`absolute inset-0 z-40 grid place-items-center overflow-hidden ${kashkool ? 'intro-kashkool' : 'intro-kanz'}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.08 }}
      transition={{ duration: 0.45 }}
    >
      {celebration.mode === 'video' && celebration.video && (
        <CelebrationVideo celebration={celebration} kashkool={kashkool} onBlocked={onBlocked} />
      )}
      <motion.div
        className={`rays ${kashkool ? 'rays-kashkool' : 'rays-kanz'}`}
        animate={{ rotate: 360 }}
        transition={{ duration: kashkool ? 9 : 22, ease: 'linear', repeat: Infinity }}
      />
      {kashkool ? <Confetti /> : <Sparkles />}
      <motion.div
        className="relative z-10 flex flex-col items-center"
        animate={kashkool ? { y: [0, -18, 0], rotate: [0, -2, 2, 0] } : { y: [0, -12, 0], scale: [1, 1.03, 1] }}
        transition={{ delay: 1.6, duration: kashkool ? 1.4 : 2.6, ease: 'easeInOut', repeat: Infinity }}
      >
        <motion.img
          src={celebration.image}
          alt=""
          className="intro-image h-[46vh] w-auto max-w-[70vw] object-contain"
          initial={kashkool ? { scale: 0, rotate: -200 } : { scale: 0.2, y: 120, opacity: 0 }}
          animate={
            kashkool ? { scale: [0, 1.15, 1], rotate: [-200, 12, -6, 0] } : { scale: [0.2, 1.08, 1], y: 0, opacity: 1 }
          }
          transition={{ duration: kashkool ? 1.1 : 1.2, ease: 'easeOut' }}
        />
        <motion.h2
          className={`mt-[4vh] text-[clamp(3rem,8vw,9rem)] font-black leading-none ${kashkool ? 'intro-title-kashkool' : 'intro-title-kanz'}`}
          initial={{ scale: 2.4, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.7, type: 'spring', stiffness: 220, damping: 14 }}
        >
          {kashkool ? 'كشكول!' : 'كنز!'}
        </motion.h2>
        <motion.p
          className="mt-[2.5vh] text-[clamp(1.2rem,2.4vw,2.8rem)] font-black text-white"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 1.2 }}
        >
          {kashkool
            ? `تحدٍّ بقيمة ${number(tile.points)} نقطة`
            : `النقاط مضاعفة ×${number(game.branding.kanzMultiplier)} — ${number(tile.points)} نقطة`}
        </motion.p>
      </motion.div>
    </motion.div>
  );
}

// The celebration video with its sound, framed over rays and confetti (or
// sparkles for a كنز); once it ends it fades away to reveal the animated
// picture underneath.
function CelebrationVideo({
  celebration,
  kashkool,
  onBlocked,
}: {
  celebration: Celebration;
  kashkool: boolean;
  onBlocked: () => void;
}) {
  const src = celebration.video!;
  const ref = useRef<HTMLVideoElement>(null);
  const [done, setDone] = useState(false);
  useEffect(() => {
    const video = trackForeground(ref.current!);
    void video.play().catch(() => {
      // Sound not allowed yet: show the video muted and ask for a click.
      onBlocked();
      video.muted = true;
      void video.play().catch(() => setDone(true));
    });
    return () => video.pause();
    // Plays once per video; onBlocked is a new function on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <AnimatePresence>
      {!done && (
        <motion.div
          key="video"
          className={`${kashkool ? 'kashkool-stage' : 'kanz-stage'} absolute inset-0 z-20 grid place-items-center overflow-hidden`}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8 }}
        >
          <motion.div
            className={`rays ${kashkool ? 'rays-kashkool-video' : 'rays-kanz-video'}`}
            animate={{ rotate: 360 }}
            transition={{ duration: 16, ease: 'linear', repeat: Infinity }}
          />
          {kashkool ? (
            <>
              <Confetti />
              <FloatingSuits />
            </>
          ) : (
            <Sparkles />
          )}
          <motion.div
            className="relative z-10"
            initial={{ scale: 0, rotate: -14 }}
            animate={{ scale: 1, rotate: [-14, 3, -1.5, 0] }}
            transition={{ duration: 0.9, ease: 'easeOut' }}
          >
            <motion.div
              className="video-frame"
              animate={{ y: [0, -10, 0], rotate: [0, -0.8, 0.8, 0] }}
              transition={{ delay: 1, duration: 3.2, ease: 'easeInOut', repeat: Infinity }}
            >
              <video
                ref={ref}
                src={src}
                playsInline
                preload="auto"
                onEnded={() => setDone(true)}
                className="block max-h-[70vh] w-[min(68vw,112vh)] rounded-[8px] bg-black object-contain"
              />
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Card suits, stars and discs like the ones in the كشكول video, drifting up both sides.
const SUITS = Array.from({ length: 16 }, (_, i) => ({
  ch: ['♠', '♥', '★', '♦', '●', '♣'][i % 6],
  x: i % 2 ? 2 + ((i * 7) % 12) : 86 + ((i * 5) % 12),
  size: 2.2 + (i % 4) * 0.9,
  d: i * 0.55,
  dur: 7 + (i % 5),
}));
function FloatingSuits() {
  return (
    <>
      {SUITS.map((p, i) => (
        <motion.span
          key={i}
          aria-hidden
          className="floating-suit"
          style={{ left: `${p.x}%`, fontSize: `${p.size}vw`, color: CONFETTI_COLORS[i % CONFETTI_COLORS.length] }}
          initial={{ y: '10vh' }}
          animate={{ y: '-120vh', rotate: i % 2 ? 360 : -360 }}
          transition={{ duration: p.dur, delay: p.d, ease: 'linear', repeat: Infinity }}
        >
          {p.ch}
        </motion.span>
      ))}
    </>
  );
}

const SPARKLES = Array.from({ length: 22 }, (_, i) => ({
  x: (i * 37) % 100,
  y: (i * 53 + 11) % 100,
  d: (i % 7) * 0.25,
  s: 10 + (i % 4) * 8,
}));
function Sparkles() {
  return (
    <>
      {SPARKLES.map((p, i) => (
        <motion.span
          key={i}
          className="sparkle"
          style={{ left: `${p.x}%`, top: `${p.y}%`, width: p.s, height: p.s }}
          animate={{ scale: [0, 1, 0], opacity: [0, 1, 0], rotate: [0, 90] }}
          transition={{ duration: 1.6, delay: p.d, repeat: Infinity, repeatDelay: 0.4 }}
        />
      ))}
    </>
  );
}

const CONFETTI_COLORS = ['#ff4f8b', '#ffd23f', '#3ec6ff', '#7cff6b', '#b46bff'];
const CONFETTI = Array.from({ length: 36 }, (_, i) => ({
  angle: (i / 36) * Math.PI * 2,
  dist: 38 + (i % 5) * 9,
  color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
  d: (i % 6) * 0.05,
}));
function Confetti() {
  return (
    <>
      {CONFETTI.map((p, i) => (
        <motion.span
          key={i}
          className="confetti"
          style={{ background: p.color }}
          initial={{ x: 0, y: 0, opacity: 0, rotate: 0 }}
          animate={{
            x: `${Math.cos(p.angle) * p.dist}vw`,
            y: `${Math.sin(p.angle) * p.dist}vh`,
            opacity: [0, 1, 1, 0],
            rotate: 540,
          }}
          transition={{ duration: 2.2, delay: 0.35 + p.d, ease: 'easeOut', repeat: Infinity, repeatDelay: 0.6 }}
        />
      ))}
    </>
  );
}

function AwardBanner({ team, points }: { team: GameTeam; points: number }) {
  return (
    <motion.div
      className="pointer-events-none absolute inset-0 z-40 grid place-items-center bg-[#05060b99]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="award-banner px-[5vw] py-[4vh] text-center"
        initial={{ scale: 0.6, y: 40 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 15 }}
      >
        <p className="tabular-nums text-[clamp(3rem,8vw,9rem)] font-bold leading-none text-[#f2c75d]">
          +{number(points)}
        </p>
        <p className="mt-[2vh] text-[clamp(1.6rem,3.6vw,4.2rem)] font-black">
          <TeamDot color={team.color} className="ml-[.35em]" />
          <bdi>{team.name}</bdi>
        </p>
      </motion.div>
    </motion.div>
  );
}
