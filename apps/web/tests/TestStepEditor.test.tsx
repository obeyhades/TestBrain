import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, Form, RouterProvider } from 'react-router';
import { TestStepEditor } from '../src/features/testCases/TestStepEditor';
import { readStepsFromForm, type TestStep } from '../src/features/testCases/testCase.api';

const STEPS: TestStep[] = [
  { position: 1, action: 'Open the login page', expectedResult: 'The login form is shown' },
  { position: 2, action: 'Enter valid credentials', expectedResult: 'They are accepted' },
  { position: 3, action: 'Press Login', expectedResult: 'The dashboard is shown' },
];

function renderEditor(steps: TestStep[], action?: (args: { request: Request }) => unknown) {
  const router = createMemoryRouter(
    [
      {
        path: '/',
        element: (
          <Form method="post">
            <TestStepEditor steps={steps} />
            <button type="submit">Save</button>
          </Form>
        ),
        action,
      },
    ],
    { initialEntries: ['/'] },
  );

  return render(<RouterProvider router={router} />);
}

/** Submits the form and reads back the steps the way the real action does. */
function makeCapturingAction() {
  return vi.fn(async ({ request }: { request: Request }) => {
    return { steps: readStepsFromForm(await request.formData()) };
  });
}

async function submittedSteps(action: { mock: { results: { value: unknown }[] } }) {
  const firstCall = action.mock.results[0];

  if (firstCall === undefined) {
    throw new Error('The form was never submitted');
  }

  return (await firstCall.value) as { steps: { action: string; expectedResult: string }[] };
}

describe('TestStepEditor', () => {
  it('numbers the steps it was given', async () => {
    renderEditor(STEPS);

    expect(await screen.findByText('Step 1')).toBeInTheDocument();
    expect(screen.getByText('Step 3')).toBeInTheDocument();
  });

  it('says so when there are no steps yet', async () => {
    renderEditor([]);

    expect(await screen.findByText('No steps yet.')).toBeInTheDocument();
  });

  it('adds an empty step at the end', async () => {
    renderEditor(STEPS);

    await userEvent.click(await screen.findByRole('button', { name: 'Add step' }));

    expect(screen.getByText('Step 4')).toBeInTheDocument();
  });

  it('removes a step and renumbers the rest', async () => {
    renderEditor(STEPS);

    await userEvent.click(await screen.findByRole('button', { name: 'Remove step 2' }));

    expect(screen.queryByText('Step 3')).not.toBeInTheDocument();
    expect(screen.getByDisplayValue('Press Login')).toBeInTheDocument();
  });

  it('saves the steps in the order shown', async () => {
    const action = makeCapturingAction();
    renderEditor(STEPS, action);

    await userEvent.click(await screen.findByRole('button', { name: 'Save' }));

    expect((await submittedSteps(action)).steps.map((step) => step.action)).toEqual([
      'Open the login page',
      'Enter valid credentials',
      'Press Login',
    ]);
  });

  it('saves the new order after a step is moved up', async () => {
    const action = makeCapturingAction();
    renderEditor(STEPS, action);

    await userEvent.click(await screen.findByRole('button', { name: 'Move step 2 up' }));
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect((await submittedSteps(action)).steps.map((step) => step.action)).toEqual([
      'Enter valid credentials',
      'Open the login page',
      'Press Login',
    ]);
  });

  it('keeps what was typed when a step is moved', async () => {
    const action = makeCapturingAction();
    renderEditor([], action);

    await userEvent.click(await screen.findByRole('button', { name: 'Add step' }));
    await userEvent.click(screen.getByRole('button', { name: 'Add step' }));

    const actions = screen.getAllByRole('textbox', { name: 'Action' });
    await userEvent.type(actions[0]!, 'First');
    await userEvent.type(actions[1]!, 'Second');

    await userEvent.click(screen.getByRole('button', { name: 'Move step 2 up' }));
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect((await submittedSteps(action)).steps.map((step) => step.action)).toEqual([
      'Second',
      'First',
    ]);
  });

  it('drops rows that were left completely empty', async () => {
    const action = makeCapturingAction();
    renderEditor([], action);

    await userEvent.click(await screen.findByRole('button', { name: 'Add step' }));
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect((await submittedSteps(action)).steps).toEqual([]);
  });
});
