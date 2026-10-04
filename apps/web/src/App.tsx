import { lazy, Suspense, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Redirect, Route, Switch, useLocation, Router as WouterRouter } from 'wouter';
import { useGetAccess } from '@kanz/api-client-react';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { Loading, ServerError } from '@/components/ui';
import { MainScreen } from '@/pages/MainScreen';
import { NotFound } from '@/pages/NotFound';

// The control pages load on demand, so the audience screen doesn't ship them.
const AdminPage = lazy(() => import('@/pages/AdminPage').then((m) => ({ default: m.AdminPage })));
const McPage = lazy(() => import('@/pages/McPage').then((m) => ({ default: m.McPage })));
const SetupPage = lazy(() => import('@/pages/SetupPage').then((m) => ({ default: m.SetupPage })));

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: true } } });

// The control pages share a dark shell; the main screen is full-bleed.
function ControlShell({ children }: { children: ReactNode }) {
  return (
    <div className="grain min-h-[100dvh] bg-[#10121a] text-[#f3f0e7]" dir="rtl">
      {children}
    </div>
  );
}

// Until onboarding has saved a game, the control pages send everyone to the
// main screen's welcome, which leads to /setup.
function NeedsGame({ children }: { children: ReactNode }) {
  const access = useGetAccess();
  if (access.isError) return <ServerError />;
  if (!access.data) return <Loading />;
  if (!access.data.gameConfigured) return <Redirect to="/" replace />;
  return children;
}

function Routes() {
  const [location] = useLocation();
  return (
    <ErrorBoundary resetKey={location}>
      <Suspense fallback={<Loading />}>
        <Switch>
          <Route path="/" component={MainScreen} />
          <Route path="/mc">
            <ControlShell>
              <NeedsGame>
                <McPage />
              </NeedsGame>
            </ControlShell>
          </Route>
          <Route path="/admin">
            <ControlShell>
              <NeedsGame>
                <AdminPage />
              </NeedsGame>
            </ControlShell>
          </Route>
          <Route path="/setup">
            <ControlShell>
              <SetupPage />
            </ControlShell>
          </Route>
          <Route>
            <ControlShell>
              <NotFound />
            </ControlShell>
          </Route>
        </Switch>
      </Suspense>
    </ErrorBoundary>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
        <Routes />
      </WouterRouter>
    </QueryClientProvider>
  );
}
