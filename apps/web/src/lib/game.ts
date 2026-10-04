import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  getGetHostGameQueryKey,
  getGetPlaysQueryKey,
  getGetPublicGameQueryKey,
  type ApiError,
  type Branding,
  type GameTeam,
} from '@kanz/api-client-react';

export const number = (value: number) => value.toLocaleString('ar-JO', { useGrouping: false });

// The page title follows the configured game name.
export function useDocumentTitle(branding: Branding | undefined, suffix?: string) {
  const title = branding?.title;
  useEffect(() => {
    if (title) document.title = suffix ? `${suffix} · ${title}` : title;
  }, [title, suffix]);
}

// Refetches every game view after an admin action.
export function useRefreshGame() {
  const client = useQueryClient();
  return () =>
    Promise.all([
      client.invalidateQueries({ queryKey: getGetHostGameQueryKey() }),
      client.invalidateQueries({ queryKey: getGetPublicGameQueryKey() }),
      client.invalidateQueries({ queryKey: getGetPlaysQueryKey() }),
    ]);
}

// Options for admin-only queries: keep trying through network hiccups, but
// give up at once without a session (AdminGate then asks for the password).
export const adminQuery = (pollMs?: number) => ({
  retry: (count: number, error: ApiError) => error.status !== 401 && count < 3,
  ...(pollMs
    ? {
        refetchInterval: (query: { state: { error: ApiError | null } }) =>
          query.state.error?.status === 401 ? false : pollMs,
      }
    : {}),
});

export const teamName = (teams: GameTeam[], id: number) =>
  teams.find((t) => t.id === id)?.name ?? `الفريق ${number(id)}`;

const ORDINALS = ['الأول', 'الثاني', 'الثالث', 'الرابع', 'الخامس', 'السادس', 'السابع', 'الثامن', 'التاسع', 'العاشر'];
export const placeName = (rank: number) => `المركز ${ORDINALS[rank - 1] ?? number(rank)}`;

// Competition ranking: tied teams share a rank (1, 1, 3, …).
export function rankTeams(teams: GameTeam[]) {
  const sorted = [...teams].sort((a, b) => b.score - a.score || a.id - b.id);
  return sorted.map((team) => ({ team, rank: sorted.findIndex((t) => t.score === team.score) + 1 }));
}

// The admin's leaderboard reveal, one entry per "next" press, from last place
// up: a card flips open, except that a top-3 team takes two presses (its
// spotlight starts with the name hidden, then the name shows). One last press
// ends the champion's spotlight.
export type RevealStep = { kind: 'open' | 'tease' | 'name'; position: number } | { kind: 'finale' };
export function revealSteps(ranked: ReturnType<typeof rankTeams>): RevealStep[] {
  const steps: RevealStep[] = [];
  for (let position = ranked.length - 1; position >= 0; position--) {
    if (ranked[position].rank <= 3) steps.push({ kind: 'tease', position }, { kind: 'name', position });
    else steps.push({ kind: 'open', position });
  }
  steps.push({ kind: 'finale' });
  return steps;
}

// "تحدي البالون بالرأس: حافظ على…" → title + description.
export function splitChallenge(text: string) {
  const at = text.indexOf(':');
  if (at === -1) return { title: text.trim(), detail: '' };
  return { title: text.slice(0, at).trim(), detail: text.slice(at + 1).trim() };
}
