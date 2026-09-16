import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { TestRunDetailPage } from '../src/features/testRuns/TestRunDetailPage';
import type { TestRunDetail } from '../src/features/testRuns/testRun.api';

const RUN: TestRunDetail = {
  id: 'run-1',
  name: 'CI run',
  status: 'OPEN',
  summary: { total: 0, passed: 0, failed: 0, blocked: 0, notRun: 0, passRate: 0 },
  results: [],
};

function renderPage(action: () => unknown) {
  const router = createMemoryRouter(
    [
      {
        path: '/projects/:projectId/test-runs/:testRunId',
        element: <TestRunDetailPage />,
        loader: () => ({ testRun: RUN, availableTestCases: [] }),
        action,
      },
    ],
    { initialEntries: ['/projects/p1/test-runs/run-1'] },
  );

  return render(<RouterProvider router={router} />);
}

/**
 * Submits the import form without going through the file input.
 *
 * userEvent.upload sets input.files by shadowing the property, but jsdom's
 * constraint validation reads its own internal list, so a required file input
 * still counts as empty and a click on Import never submits. Reading the file
 * for real is covered in a browser; these tests cover what the page does with
 * the answer.
 */
async function submitImportForm() {
  const input = await screen.findByLabelText('JUnit XML report');
  const form = input.closest('form');

  if (form === null) {
    throw new Error('The file input is not inside a form');
  }

  fireEvent.submit(form);
}

describe('the import form on the test run page', () => {
  it('is wired the way the action expects', async () => {
    renderPage(() => null);

    const input = await screen.findByLabelText('JUnit XML report');
    const form = input.closest('form');

    expect(input).toHaveAttribute('type', 'file');
    expect(input).toHaveAttribute('name', 'report');
    expect(input).toBeRequired();
    // The action reads the file in the browser, so the form must carry it as a file.
    expect(form).toHaveAttribute('enctype', 'multipart/form-data');
    expect(form?.querySelector('input[name="intent"]')).toHaveValue('import');
  });

  it('says what the import did, including the test cases it created', async () => {
    renderPage(() => ({
      imported: { recorded: 3, addedToRun: 1, created: ['Mystery test'] },
    }));

    await submitImportForm();

    expect(await screen.findByRole('status')).toHaveTextContent(
      'Recorded 3 results, adding 1 to the run. Created 1 new test case: Mystery test.',
    );
  });

  it('uses the singular for one result and stays quiet when nothing was created', async () => {
    renderPage(() => ({ imported: { recorded: 1, addedToRun: 0, created: [] } }));

    await submitImportForm();

    expect(await screen.findByRole('status')).toHaveTextContent('Recorded 1 result.');
  });

  it('shows the reason when the import is refused', async () => {
    renderPage(() => ({ error: 'No <testsuite> elements found. Is this a JUnit XML report?' }));

    await submitImportForm();

    expect(await screen.findByRole('alert')).toHaveTextContent('Is this a JUnit XML report?');
  });
});
