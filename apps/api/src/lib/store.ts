import { eq } from 'drizzle-orm';
import { db, gameConfigTable, liveGameTable } from '@kanz/db';
import { buildTiles, migrateConfig, sampleGame, type GameConfig, type Tile } from '@kanz/game-core';

// Bump when LiveState's shape changes; older rows are then replaced (keeping
// the password). New optional fields don't need a bump.
const STATE_VERSION = 4;

type EventType = 'opened' | 'intro' | 'answer' | 'finished' | 'cancelled' | 'view' | 'admin';
export type LiveState = {
  version: typeof STATE_VERSION;
  passwordHash?: string;
  // Every tile that has been opened, in play order. teamId (1-based, as in
  // the config's team list) is absent when nobody won it.
  plays: { tileId: string; teamId?: number; points: number }[];
  currentId: string | null;
  // The main screen loops the كنز/كشكول celebration until the admin ends it.
  intro?: boolean;
  // Index into the config's rounds of the match now playing.
  round?: number;
  answerState: 'pending' | 'shown' | 'hidden';
  // How the shown answer was judged; drives its sound and animation.
  answerVerdict?: 'correct' | 'wrong';
  view: 'board' | 'scoreboard' | 'reveal';
  // With view "reveal": how many times the admin has pressed "next".
  revealStep?: number;
  event: { id: number; type: EventType; tileId?: string; teamId?: number; points?: number };
};

export type Game = { config: GameConfig; tiles: Tile[]; configured: boolean };

export function freshState(passwordHash?: string, eventId = 0): LiveState {
  return {
    version: STATE_VERSION,
    ...(passwordHash ? { passwordHash } : {}),
    plays: [],
    currentId: null,
    answerState: 'pending',
    view: 'board',
    event: { id: eventId, type: 'admin' },
  };
}

export async function loadState(): Promise<LiveState> {
  const [row] = await db.select().from(liveGameTable).where(eq(liveGameTable.id, 1));
  const stored = row?.state as Partial<LiveState> | undefined;
  if (stored?.version === STATE_VERSION) return stored as LiveState;
  const state = freshState(stored?.passwordHash);
  await db
    .insert(liveGameTable)
    .values({ id: 1, state })
    .onConflictDoUpdate({ target: liveGameTable.id, set: { state } });
  return state;
}

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

// Runs fn in a transaction holding the live_game row lock, so every state and
// config change waits for the one before it.
async function withStateLock<T>(fn: (state: LiveState, tx: Tx) => Promise<T>): Promise<T> {
  await loadState();
  return db.transaction(async (tx) => {
    const [row] = await tx.select().from(liveGameTable).where(eq(liveGameTable.id, 1)).for('update');
    return fn(row.state as LiveState, tx);
  });
}

// Applies transform under the lock; a string result is an error message and
// leaves the state unchanged.
export function updateState(
  transform: (state: LiveState) => LiveState | string,
): Promise<{ state?: LiveState; error?: string }> {
  return withStateLock(async (state, tx) => {
    const next = transform(state);
    if (typeof next === 'string') return { error: next };
    await tx.update(liveGameTable).set({ state: next }).where(eq(liveGameTable.id, 1));
    return { state: next };
  });
}

// The configuration is read on every poll, so it is cached; this process is
// the only writer. Until onboarding saves a game, the sample game stands in.
let cached: Game | undefined;

function toGame(stored: unknown): Game {
  const config = stored ? migrateConfig(stored) : sampleGame;
  return { config, tiles: buildTiles(config), configured: !!stored };
}

export async function loadConfig(): Promise<Game> {
  if (cached) return cached;
  const [row] = await db.select().from(gameConfigTable).where(eq(gameConfigTable.id, 1));
  cached = toGame(row?.config);
  return cached;
}

// Like updateState, for the configuration: transform sees the stored game and
// the live state under the same lock (so no tile opens in between), and the
// cache follows once the write has committed.
export async function updateConfig(
  transform: (game: Game, state: LiveState) => GameConfig | string,
): Promise<{ game?: Game; error?: string }> {
  const result = await withStateLock(async (state, tx) => {
    const [row] = await tx.select().from(gameConfigTable).where(eq(gameConfigTable.id, 1));
    const config = transform(toGame(row?.config), state);
    if (typeof config === 'string') return { error: config };
    await tx
      .insert(gameConfigTable)
      .values({ id: 1, config })
      .onConflictDoUpdate({ target: gameConfigTable.id, set: { config } });
    return { config };
  });
  if (!result.config) return { error: result.error };
  cached = toGame(result.config);
  return { game: cached };
}

// Soundboard presses and background music are fire-and-forget, so they live
// in memory rather than in LiveState. The main screen plays a sound whenever
// its id changes.
export const cues = {
  sound: { id: 0 } as { id: number; name?: string; url?: string },
  music: { on: true, volume: 0.5 },
};
