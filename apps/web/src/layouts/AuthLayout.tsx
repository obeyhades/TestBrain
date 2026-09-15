import type { ReactNode } from 'react';

type AuthLayoutProps = {
  title: string;
  description: string;
  children: ReactNode;
};

/** The centred card used by the sign-in and first-run screens. */
export function AuthLayout({ title, description, children }: AuthLayoutProps) {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <main className="w-full max-w-sm">
        <h1 className="text-base font-semibold tracking-tight">{title}</h1>
        <p className="mt-1 text-sm text-ink-muted">{description}</p>

        <div className="mt-6 rounded-lg border border-border bg-surface p-5">{children}</div>
      </main>
    </div>
  );
}
