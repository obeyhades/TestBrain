import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { ProjectsPage } from '../src/features/projects/ProjectsPage';
import type { Project } from '../src/features/projects/project.api';

const PROJECTS: Project[] = [
  {
    id: 'project-1',
    name: 'Checkout redesign',
    description: 'Q3 work',
    createdAt: '2026-01-01T12:00:00.000Z',
  },
  { id: 'project-2', name: 'Mobile app', description: null, createdAt: '2026-01-02T12:00:00.000Z' },
];

function renderProjectsPage(projects: Project[], action?: () => unknown) {
  const router = createMemoryRouter(
    [{ path: '/projects', element: <ProjectsPage />, loader: () => projects, action }],
    { initialEntries: ['/projects'] },
  );

  return render(<RouterProvider router={router} />);
}

describe('ProjectsPage', () => {
  it('lists each project as a link to it', async () => {
    renderProjectsPage(PROJECTS);

    expect(await screen.findByRole('link', { name: /Checkout redesign/ })).toHaveAttribute(
      'href',
      '/projects/project-1',
    );
    expect(screen.getByRole('link', { name: /Mobile app/ })).toBeInTheDocument();
  });

  it('explains what to do when there are no projects yet', async () => {
    renderProjectsPage([]);

    expect(await screen.findByText(/No projects yet/)).toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('keeps the dialog closed until it is asked for', async () => {
    renderProjectsPage(PROJECTS);

    await screen.findByRole('button', { name: 'New project' });

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('opens a dialog with a name field and moves focus into it', async () => {
    renderProjectsPage(PROJECTS);

    await userEvent.click(await screen.findByRole('button', { name: 'New project' }));

    const dialog = await screen.findByRole('dialog');

    expect(dialog).toBeInTheDocument();
    expect(screen.getByLabelText('Name')).toBeInTheDocument();
  });

  it('closes on Escape, which is what people expect from a dialog', async () => {
    renderProjectsPage(PROJECTS);

    await userEvent.click(await screen.findByRole('button', { name: 'New project' }));
    await screen.findByRole('dialog');

    await userEvent.keyboard('{Escape}');

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('shows what the server said when creating fails', async () => {
    renderProjectsPage(PROJECTS, () => ({ error: 'Project name is required' }));

    await userEvent.click(await screen.findByRole('button', { name: 'New project' }));
    await userEvent.type(await screen.findByLabelText('Name'), 'x');
    await userEvent.click(screen.getByRole('button', { name: 'Create project' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Project name is required');
  });
});
