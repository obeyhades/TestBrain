import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { MembersPage } from '../src/features/projects/MembersPage';
import type { ProjectMember } from '../src/features/projects/project.api';

const MEMBERS: ProjectMember[] = [
  { userId: 'user-1', email: 'owner@example.com', name: 'Owner', role: 'ADMIN' },
  { userId: 'user-2', email: 'tester@example.com', name: 'Tess', role: 'QA' },
];

/** Reads what the action received, failing clearly if it was never called. */
async function firstSubmission(action: {
  mock: { results: { value: unknown }[] };
}): Promise<{ submitted: Record<string, string> }> {
  const firstCall = action.mock.results[0];

  if (firstCall === undefined) {
    throw new Error('The action was never called');
  }

  return (await firstCall.value) as { submitted: Record<string, string> };
}

function renderMembersPage(action?: (args: { request: Request }) => unknown) {
  const router = createMemoryRouter(
    [{ path: '/members', element: <MembersPage />, loader: () => MEMBERS, action }],
    { initialEntries: ['/members'] },
  );

  return render(<RouterProvider router={router} />);
}

describe('MembersPage', () => {
  it('shows one row per member with their role', async () => {
    renderMembersPage();

    const owner = within(await screen.findByRole('row', { name: /Owner/ }));

    expect(owner.getByRole('combobox')).toHaveValue('ADMIN');
    expect(screen.getByRole('row', { name: /Tess/ })).toBeInTheDocument();
  });

  it('gives each role control a name of its own, so they are told apart', async () => {
    renderMembersPage();

    expect(await screen.findByLabelText('Role for Owner')).toBeInTheDocument();
    expect(screen.getByLabelText('Role for Tess')).toBeInTheDocument();
  });

  it('submits a role change as soon as a new role is picked', async () => {
    const action = vi.fn(async ({ request }: { request: Request }) => {
      return { submitted: Object.fromEntries(await request.formData()) };
    });

    renderMembersPage(action);

    await userEvent.selectOptions(await screen.findByLabelText('Role for Tess'), 'DEVELOPER');

    expect(action).toHaveBeenCalled();
    expect((await firstSubmission(action)).submitted).toEqual({
      intent: 'changeRole',
      userId: 'user-2',
      role: 'DEVELOPER',
    });
  });

  it('sends the add form with the add intent', async () => {
    const action = vi.fn(async ({ request }: { request: Request }) => {
      return { submitted: Object.fromEntries(await request.formData()) };
    });

    renderMembersPage(action);

    await userEvent.type(await screen.findByLabelText('Email'), 'newcomer@example.com');
    await userEvent.click(screen.getByRole('button', { name: 'Add member' }));

    expect((await firstSubmission(action)).submitted).toMatchObject({
      intent: 'add',
      email: 'newcomer@example.com',
      role: 'QA',
    });
  });

  it('shows the reason the server refused', async () => {
    renderMembersPage(() => ({ error: 'A project must always have at least one administrator' }));

    await userEvent.click((await screen.findAllByRole('button', { name: 'Remove' }))[0]!);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'A project must always have at least one administrator',
    );
  });
});
