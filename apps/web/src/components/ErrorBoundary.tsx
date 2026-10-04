import { Component, type ReactNode } from 'react';

// Shows a retry screen instead of a blank page when rendering fails. Changing
// resetKey (the route) clears the error.
export class ErrorBoundary extends Component<{ children: ReactNode; resetKey?: unknown }, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: unknown) {
    return { error: error instanceof Error ? error : new Error(String(error)) };
  }

  componentDidUpdate(prev: { resetKey?: unknown }) {
    if (this.state.error && prev.resetKey !== this.props.resetKey) this.setState({ error: null });
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    return (
      <main className="grid min-h-[100dvh] place-items-center bg-[#10121a] p-6 text-center" dir="rtl">
        <div className="max-w-lg">
          <h1 className="text-xl font-black text-[#f2c75d]">حدث خطأ غير متوقع</h1>
          <p className="mt-2 text-sm text-ink-60">تعذّر عرض هذه الصفحة. اللعبة محفوظة على الخادم ولم يتأثر شيء.</p>
          {import.meta.env.DEV && (
            <pre dir="ltr" className="mt-4 overflow-x-auto bg-black/30 p-3 text-left text-xs text-ink-70">
              {error.message}
            </pre>
          )}
          <button
            type="button"
            onClick={() => this.setState({ error: null })}
            className="mt-5 bg-[#e9bb4f] px-5 py-2.5 text-sm font-black text-[#14151c] hover:bg-[#f5cf73]"
          >
            إعادة المحاولة
          </button>
        </div>
      </main>
    );
  }
}
