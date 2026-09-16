import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { TestRunsPage } from '../src/features/testRuns/TestRunsPage';
import type { TestRunListItem } from '../src/features/testRuns/testRun.api';

const SUMMARY = { total: 2, passed: 2, failed: 0, blocked: 0, notRun: 0, passRate: 100 };

const TEST_RUNS: TestRunListItem[] = [
  {
    id: 'run-1',
    name: 'Regression - v1.4.0',
    status: 'OPEN',
    createdAt: '2026-01-01T12:00:00.000Z',
    summary: SUMMARY,
  },
  {
    id: 'run-2',
    name: 'Smoke - v1.3.2',
    status: 'COMPLETED',
    createdAt: '2026-01-02T12:00:00.000Z',
    summary: SUMMARY,
  },
];

function renderTestRunsPage(testRuns: TestRunListItem[]) {
  const router = createMemoryRouter(
    [
      { path: '/projects/:projectId/test-runs', element: <TestRunsPage />, loader: () => testRuns },
      {
        path: '/projects/:projectId/test-runs/:testRunId',
        element: <p>You are looking at one run</p>,
      },
    ],
    { initialEntries: ['/projects/project-1/test-runs'] },
  );

  return render(<RouterProvider router={router} />);
}

describe('TestRunsPage', () => {
  it('links each run to its own page', async () => {
    renderTestRunsPage(TEST_RUNS);

    expect(await screen.findByRole('link', { name: /Regression - v1\.4\.0/ })).toHaveAttribute(
      'href',
      '/projects/project-1/test-runs/run-1',
    );
    expect(screen.getByRole('link', { name: /Smoke - v1\.3\.2/ })).toHaveAttribute(
      'href',
      '/projects/project-1/test-runs/run-2',
    );
  });

  it('opens the run when the status badge is clicked, since it looks like a button', async () => {
    renderTestRunsPage(TEST_RUNS);

    await userEvent.click(await screen.findByText('In progress'));

    expect(await screen.findByText('You are looking at one run')).toBeInTheDocument();
  });

  it('describes the status as a state, never as an action called "Open"', async () => {
    renderTestRunsPage(TEST_RUNS);

    expect(await screen.findByText('In progress')).toBeInTheDocument();
    expect(screen.getByText('Completed')).toBeInTheDocument();
    expect(screen.queryByText('Open')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Open' })).not.toBeInTheDocument();
  });

  it('explains what a run is when there are none yet', async () => {
    renderTestRunsPage([]);

    expect(await screen.findByText(/No test runs yet/)).toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });
});
