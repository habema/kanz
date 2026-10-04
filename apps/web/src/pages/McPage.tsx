import { useQueryClient } from '@tanstack/react-query';
import { getGetHostGameQueryKey, useGetHostGame, useLogout } from '@kanz/api-client-react';
import { Trophy } from 'lucide-react';
import { AdminGate } from '@/components/AdminGate';
import { BoardGrid, MatchPanel, Standings, TileCard } from '@/components/Control';
import { ControlHeader } from '@/components/ui';
import { adminQuery } from '@/lib/game';

const VIEW_NAMES = { board: 'اللوحة', scoreboard: 'الترتيب', reveal: 'كشف الترتيب' };

// The co-host's view: everything they need to know (the open tile with its
// answer, كنز/كشكول positions, scores) but no controls. Those live on /admin.
export function McPage() {
  const query = useGetHostGame({ query: { queryKey: getGetHostGameQueryKey(), ...adminQuery(1000) } });
  const client = useQueryClient();
  const logout = useLogout({
    mutation: { onSuccess: () => client.resetQueries({ queryKey: getGetHostGameQueryKey() }) },
  });
  const game = query.data;
  return (
    <AdminGate query={query}>
      {game && (
        <>
          <ControlHeader title="غرفة المقدم" branding={game.branding}>
            <span className="border border-white/15 px-3 py-2 text-xs font-bold text-ink-50">
              الشاشة الآن: {game.current ? 'سؤال مفتوح' : VIEW_NAMES[game.view]}
            </span>
            <button
              type="button"
              onClick={() => logout.mutate()}
              className="px-2 py-2 text-xs text-ink-40 hover:text-white"
            >
              خروج
            </button>
          </ControlHeader>
          <main className="mx-auto grid max-w-[1450px] gap-6 px-4 py-6 sm:px-8 xl:grid-cols-[minmax(0,1fr)_300px]">
            <div className="min-w-0">
              {game.current ? <TileCard game={game} tile={game.current} /> : <BoardGrid game={game} />}
            </div>
            <aside className="grid gap-4 self-start">
              {game.match.total > 0 && <MatchPanel game={game} />}
              <div className="panel-bevel p-4">
                <h2 className="mb-3 flex items-center gap-2 text-sm font-black">
                  <Trophy size={15} className="text-[#f2c75d]" /> نقاط الفرق
                </h2>
                <Standings teams={game.teams} />
              </div>
            </aside>
          </main>
        </>
      )}
    </AdminGate>
  );
}
