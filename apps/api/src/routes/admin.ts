import { Router, type IRouter, type Response } from 'express';
import {
  FinishTileBody,
  GetHostGameResponse,
  GetPlaysResponse,
  OpenTileBody,
  PlaySoundBody,
  RestoreTileParams,
  SetAnswerVisibilityBody,
  SetMusicBody,
  SetRoundBody,
  SetScreenViewBody,
  UpdatePlayBody,
  UpdatePlayParams,
  UpdateTeamsBody,
} from '@kanz/api-zod';
import { soundboardOf } from '@kanz/game-core';
import { presentGame, presentPlays, tileById } from '../lib/present';
import { cues, loadConfig, loadState, updateConfig, updateState, type Game, type LiveState } from '../lib/store';

// The admin's live controls (also read by /mc). Mounted behind requireAdmin.
const router: IRouter = Router();

type Presenter = (state: LiveState, game: Game) => unknown;
const hostGame: Presenter = (state, game) => GetHostGameResponse.parse(presentGame(state, game, true));
const playLog: Presenter = (state, game) => GetPlaysResponse.parse(presentPlays(state, game));

// Applies a state change; a string from transform is answered as a 400.
async function act(res: Response, transform: (state: LiveState, game: Game) => LiveState | string, respond: Presenter) {
  const game = await loadConfig();
  const result = await updateState((state) => transform(state, game));
  if (!result.state) {
    res.status(400).json({ error: result.error });
    return;
  }
  res.json(respond(result.state, game));
}

const nextEvent = (state: LiveState, event: Omit<LiveState['event'], 'id'>) => ({ ...event, id: state.event.id + 1 });
const isTeam = ({ config }: Game, id: number) => Number.isInteger(id) && id >= 1 && id <= config.teams.length;
const closedTile = { currentId: null, intro: false, answerState: 'pending', answerVerdict: undefined } as const;

router.get('/game', async (_req, res): Promise<void> => {
  res.json(hostGame(await loadState(), await loadConfig()));
});

router.post('/open', async (req, res): Promise<void> => {
  const input = OpenTileBody.safeParse(req.body);
  if (!input.success) {
    res.status(400).json({ error: 'خانة غير صالحة.' });
    return;
  }
  await act(
    res,
    (state, game) => {
      const tile = tileById(game, input.data.tileId);
      if (!tile) return 'خانة غير موجودة.';
      if (state.currentId) return 'أنهِ الخانة المفتوحة أولاً.';
      if (state.plays.some((play) => play.tileId === tile.id)) return 'لُعبت هذه الخانة من قبل.';
      return {
        ...state,
        ...closedTile,
        currentId: tile.id,
        plays: [...state.plays, { tileId: tile.id, points: 0 }],
        intro: tile.kanz || tile.kind === 'kashkool',
        view: 'board',
        event: nextEvent(state, { type: 'opened', tileId: tile.id }),
      };
    },
    hostGame,
  );
});

router.post('/intro/end', async (_req, res): Promise<void> => {
  await act(
    res,
    (state) => {
      if (!state.currentId || !state.intro) return 'لا يوجد احتفال جارٍ.';
      return { ...state, intro: false, event: nextEvent(state, { type: 'intro', tileId: state.currentId }) };
    },
    hostGame,
  );
});

router.post('/answer', async (req, res): Promise<void> => {
  const input = SetAnswerVisibilityBody.safeParse(req.body);
  if (!input.success) {
    res.status(400).json({ error: 'اختيار غير صالح.' });
    return;
  }
  await act(
    res,
    (state, game) => {
      const tile = tileById(game, state.currentId);
      if (!tile || tile.kind !== 'question') return 'لا يوجد سؤال مفتوح.';
      if (state.intro) return 'أنهِ الاحتفال أولاً.';
      return {
        ...state,
        answerState: input.data.show ? 'shown' : 'hidden',
        answerVerdict: input.data.show ? input.data.verdict : undefined,
        event: nextEvent(state, { type: 'answer', tileId: tile.id }),
      };
    },
    hostGame,
  );
});

router.post('/finish', async (req, res): Promise<void> => {
  const input = FinishTileBody.safeParse(req.body);
  if (!input.success) {
    res.status(400).json({ error: 'اختر فريقاً صحيحاً.' });
    return;
  }
  await act(
    res,
    (state, game) => {
      const tile = tileById(game, state.currentId);
      if (!tile) return 'لا توجد خانة مفتوحة.';
      const { teamId } = input.data;
      if (teamId !== undefined && !isTeam(game, teamId)) return 'فريق غير موجود.';
      const points = teamId === undefined ? 0 : tile.points;
      return {
        ...state,
        ...closedTile,
        round: Math.min((state.round ?? 0) + 1, game.config.rounds.length),
        plays: state.plays.map((play) =>
          play.tileId === tile.id ? { tileId: tile.id, ...(teamId !== undefined ? { teamId } : {}), points } : play,
        ),
        event: nextEvent(state, {
          type: 'finished',
          tileId: tile.id,
          ...(teamId !== undefined ? { teamId, points } : {}),
        }),
      };
    },
    hostGame,
  );
});

router.post('/cancel', async (_req, res): Promise<void> => {
  await act(
    res,
    (state) => {
      if (!state.currentId) return 'لا توجد خانة مفتوحة.';
      return {
        ...state,
        ...closedTile,
        plays: state.plays.filter((play) => play.tileId !== state.currentId),
        event: nextEvent(state, { type: 'cancelled', tileId: state.currentId }),
      };
    },
    hostGame,
  );
});

router.post('/view', async (req, res): Promise<void> => {
  const input = SetScreenViewBody.safeParse(req.body);
  if (!input.success) {
    res.status(400).json({ error: 'عرض غير صالح.' });
    return;
  }
  await act(
    res,
    (state, game) => {
      const { view, revealStep = 0 } = input.data;
      if (view !== 'board' && state.currentId) return 'أنهِ الخانة المفتوحة أولاً.';
      return {
        ...state,
        view,
        // At most two presses per team plus the finale.
        revealStep: view === 'reveal' ? Math.min(revealStep, game.config.teams.length * 2 + 1) : undefined,
        event: nextEvent(state, { type: 'view' }),
      };
    },
    hostGame,
  );
});

// Moves the schedule by hand, e.g. after a tile was restored to the board.
router.post('/round', async (req, res): Promise<void> => {
  const input = SetRoundBody.safeParse(req.body);
  if (!input.success) {
    res.status(400).json({ error: 'جولة غير صالحة.' });
    return;
  }
  await act(
    res,
    (state, game) => {
      const round = input.data.round - 1;
      if (round > game.config.rounds.length) return 'جولة غير موجودة.';
      return { ...state, round, event: nextEvent(state, { type: 'admin' }) };
    },
    hostGame,
  );
});

router.post('/sound', async (req, res): Promise<void> => {
  const input = PlaySoundBody.safeParse(req.body);
  if (!input.success) {
    res.status(400).json({ error: 'صوت غير موجود.' });
    return;
  }
  const game = await loadConfig();
  const { name } = input.data;
  const entry = soundboardOf(game.config).find((e) => e.id === name);
  if (name !== 'stop' && !entry) {
    res.status(400).json({ error: 'صوت غير موجود.' });
    return;
  }
  cues.sound = { id: cues.sound.id + 1, name, ...(entry ? { url: entry.url } : {}) };
  res.json(hostGame(await loadState(), game));
});

router.post('/music', async (req, res): Promise<void> => {
  const input = SetMusicBody.safeParse(req.body);
  if (!input.success) {
    res.status(400).json({ error: 'إعدادات موسيقى غير صالحة.' });
    return;
  }
  cues.music = input.data;
  res.json(hostGame(await loadState(), await loadConfig()));
});

router.get('/plays', async (_req, res): Promise<void> => {
  res.json(playLog(await loadState(), await loadConfig()));
});

router.put('/plays/:tileId', async (req, res): Promise<void> => {
  const params = UpdatePlayParams.safeParse(req.params);
  const input = UpdatePlayBody.safeParse(req.body);
  if (!params.success || !input.success) {
    res.status(400).json({ error: 'تصحيح غير صالح.' });
    return;
  }
  await act(
    res,
    (state, game) => {
      const { tileId } = params.data;
      const { teamId, points } = input.data;
      if (tileId === state.currentId) return 'أنهِ هذه الخانة من تبويب التحكم أولاً.';
      if (!state.plays.some((play) => play.tileId === tileId)) return 'لم تُلعب هذه الخانة بعد.';
      if (teamId !== undefined && !isTeam(game, teamId)) return 'فريق غير موجود.';
      return {
        ...state,
        plays: state.plays.map((play) =>
          play.tileId === tileId
            ? { tileId, ...(teamId !== undefined ? { teamId } : {}), points: teamId === undefined ? 0 : points }
            : play,
        ),
        event: nextEvent(state, { type: 'admin' }),
      };
    },
    playLog,
  );
});

router.delete('/plays/:tileId', async (req, res): Promise<void> => {
  const params = RestoreTileParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: 'خانة غير صالحة.' });
    return;
  }
  await act(
    res,
    (state) => {
      const { tileId } = params.data;
      if (tileId === state.currentId) return 'ألغِ هذه الخانة من تبويب التحكم.';
      if (!state.plays.some((play) => play.tileId === tileId)) return 'لم تُلعب هذه الخانة بعد.';
      return {
        ...state,
        plays: state.plays.filter((play) => play.tileId !== tileId),
        event: nextEvent(state, { type: 'admin' }),
      };
    },
    playLog,
  );
});

// Renames teams in the saved configuration; the screens pick it up on their
// next poll.
router.put('/teams', async (req, res): Promise<void> => {
  const input = UpdateTeamsBody.safeParse(req.body);
  if (!input.success) {
    res.status(400).json({ error: 'اسم الفريق من حرف إلى ٤٠ حرفاً.' });
    return;
  }
  if (!(await loadConfig()).configured) {
    res.status(400).json({ error: 'أكمل إعداد المسابقة أولاً.' });
    return;
  }
  const names = new Map(input.data.teams.map((team) => [team.id, team.name.trim()]));
  if ([...names.values()].some((name) => !name)) {
    res.status(400).json({ error: 'اسم الفريق لا يمكن أن يكون فارغاً.' });
    return;
  }
  const { game } = await updateConfig(({ config }) => ({
    ...config,
    teams: config.teams.map((team, index) => ({ ...team, name: names.get(index + 1) ?? team.name })),
  }));
  res.json(playLog(await loadState(), game!));
});

export default router;
