import { Outlet } from 'react-router';

export function AppLayout() {
  return (
    <div className="min-h-screen">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex h-12 max-w-5xl items-center px-4">
          <span className="text-sm font-semibold tracking-tight">TestBrain</span>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8">
        <Outlet />
      </main>
    </div>
  );
}
