import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { RequirementsPage } from '../src/features/requirements/RequirementsPage';
import type { Requirement } from '../src/features/requirements/requirement.api';

const REQUIREMENTS: Requirement[] = [
  {
    id: 'req-1',
    title: 'User can sign in',
    description: null,
    status: 'APPROVED',
    createdAt: '2026-01-01T12:00:00.000Z',
  },
  {
    id: 'req-2',
    title: 'Password can be reset',
    description: null,
    status: 'DRAFT',
    createdAt: '2026-01-02T12:00:00.000Z',
  },
];

function renderRequirementsPage(requirements: Requirement[], action?: () => unknown) {
  const router = createMemoryRouter(
    [
      {
        path: '/projects/:projectId/requirements',
        element: <RequirementsPage />,
        loader: () => requirements,
        action,
      },
    ],
    { initialEntries: ['/projects/project-1/requirements'] },
  );

  return render(<RouterProvider router={router} />);
}

describe('RequirementsPage', () => {
  it('shows each requirement with its status', async () => {
    renderRequirementsPage(REQUIREMENTS);

    const row = within(await screen.findByRole('row', { name: /User can sign in/ }));

    expect(row.getByText('Approved')).toBeInTheDocument();
    expect(screen.getByRole('row', { name: /Password can be reset/ })).toBeInTheDocument();
  });

  it('links each requirement to its own page', async () => {
    renderRequirementsPage(REQUIREMENTS);

    expect(await screen.findByRole('link', { name: 'User can sign in' })).toHaveAttribute(
      'href',
      '/projects/project-1/requirements/req-1',
    );
  });

  it('explains what requirements are for when there are none', async () => {
    renderRequirementsPage([]);

    expect(await screen.findByText(/No requirements yet/)).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('submits the new requirement form with a status', async () => {
    const action = vi.fn(async ({ request }: { request: Request }) => {
      return { submitted: Object.fromEntries(await request.formData()) };
    });

    renderRequirementsPage(REQUIREMENTS, action as unknown as () => unknown);

    await userEvent.click(await screen.findByRole('button', { name: 'New requirement' }));
    await userEvent.type(await screen.findByLabelText('Title'), 'Offline mode works');
    await userEvent.selectOptions(screen.getByLabelText('Status'), 'APPROVED');
    await userEvent.click(screen.getByRole('button', { name: 'Create requirement' }));

    const firstCall = action.mock.results[0];

    if (firstCall === undefined) {
      throw new Error('The action was never called');
    }

    expect((await firstCall.value).submitted).toMatchObject({
      title: 'Offline mode works',
      status: 'APPROVED',
    });
  });
});
