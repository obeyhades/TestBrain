import { Form, Link, NavLink, Outlet, useLoaderData } from 'react-router';
import { Button } from '../components/Button';
import type { CurrentUser } from '../features/auth/auth.api';

export function AppLayout() {
  const user = useLoaderData() as CurrentUser;

  return (
    <div className="min-h-screen">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex h-12 max-w-5xl items-center justify-between px-4">
          <div className="flex items-center gap-5">
            <Link to="/projects" className="text-sm font-semibold tracking-tight">
              TestBrain
            </Link>

            <NavLink
              to="/projects"
              className={({ isActive }) =>
                `text-sm ${isActive ? 'text-ink' : 'text-ink-muted hover:text-ink'}`
              }
            >
              Projects
            </NavLink>

            {/* Only the instance administrator can create accounts, so nobody else
                is shown a link that would just bounce them back. */}
            {user.isInstanceAdmin ? (
              <NavLink
                to="/users/new"
                className={({ isActive }) =>
                  `text-sm ${isActive ? 'text-ink' : 'text-ink-muted hover:text-ink'}`
                }
              >
                New account
              </NavLink>
            ) : null}
          </div>

          <div className="flex items-center gap-3">
            <span className="text-sm text-ink-muted">{user.name}</span>

            <Form method="post" action="/logout">
              <Button type="submit" variant="secondary">
                Sign out
              </Button>
            </Form>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8">
        <Outlet />
      </main>
    </div>
  );
}
