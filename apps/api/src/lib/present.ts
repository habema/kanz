import { soundboardOf } from '@kanz/game-core';
import { cues, type Game, type LiveState } from './store';

export const tileById = ({ tiles }: Game, id: string | null) => tiles.find((tile) => tile.id === id);

// Teams are numbered from 1 in config order; scores come from the plays.
function teamsWithScores(state: LiveState, { config }: Game) {
  return config.teams.map((team, index) => ({
    id: index + 1,
    name: team.name,
    color: team.color,
    score: state.plays.reduce((sum, play) => sum + (play.teamId === index + 1 ? play.points : 0), 0),
  }));
}

// The scheduled match now playing and the one after it.
function presentMatch(state: LiveState, { config }: Game) {
  const total = config.rounds.length;
  const index = Math.min(state.round ?? 0, total);
  const matchAt = (i: number) => {
    const entry = config.rounds[i];
    return entry && { picker: entry[0], opponent: entry[1] };
  };
  const current = matchAt(index);
  const next = matchAt(index + 1);
  return { round: index + 1, total, ...(current ? { current } : {}), ...(next ? { next } : {}) };
}

// The whole game for the screens. Only the host view (admin and MC) learns
// which tiles are كنز/كشكول before they open, or an answer before it's shown.
export function presentGame(state: LiveState, game: Game, host: boolean) {
  const { config, tiles } = game;
  const open = tileById(game, state.currentId);
  const used = new Set(state.plays.map((play) => play.tileId));
  const showAnswer = host || state.answerState === 'shown';
  return {
    configured: game.configured,
    branding: {
      title: config.title,
      ...(config.subtitle ? { subtitle: config.subtitle } : {}),
      kanzMultiplier: config.kanzMultiplier,
      media: config.media,
    },
    categories: config.categories.map((category) => ({
      id: category.id,
      title: category.title,
      tiles: tiles
        .filter((tile) => tile.category === category.id)
        .map((tile) => ({
          id: tile.id,
          value: tile.value,
          used: used.has(tile.id) && tile.id !== state.currentId,
          ...(host ? { kind: tile.kind, kanz: tile.kanz } : {}),
        })),
    })),
    teams: teamsWithScores(state, game),
    intro: !!open && !!state.intro,
    match: presentMatch(state, game),
    ...(open
      ? {
          current: {
            id: open.id,
            category: open.title,
            value: open.value,
            kind: open.kind,
            kanz: open.kanz,
            points: open.points,
            prompt: open.prompt,
            ...(open.answer && showAnswer ? { answer: open.answer } : {}),
          },
        }
      : {}),
    answerState: state.answerState,
    ...(state.answerState === 'shown' && state.answerVerdict ? { answerVerdict: state.answerVerdict } : {}),
    view: state.view,
    ...(state.view === 'reveal' ? { revealStep: state.revealStep ?? 0 } : {}),
    event: state.event,
    sound: cues.sound,
    music: cues.music,
    soundboard: soundboardOf(config).map(({ id, label }) => ({ id, label })),
  };
}

// Every played tile with its award, for the admin's corrections tab.
export function presentPlays(state: LiveState, game: Game) {
  return {
    teams: teamsWithScores(state, game),
    plays: state.plays.flatMap((play) => {
      const tile = tileById(game, play.tileId);
      if (!tile) return [];
      return [
        {
          tileId: play.tileId,
          category: tile.title,
          value: tile.value,
          kind: tile.kind,
          kanz: tile.kanz,
          prompt: tile.prompt,
          defaultPoints: tile.points,
          ...(play.teamId ? { teamId: play.teamId } : {}),
          points: play.points,
          open: play.tileId === state.currentId,
        },
      ];
    }),
  };
}
