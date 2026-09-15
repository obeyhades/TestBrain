import { useState } from 'react';
import { Dialog, Heading, Modal, ModalOverlay } from 'react-aria-components';
import { Form, Link, redirect, useActionData, useLoaderData, useNavigation } from 'react-router';
import type { ActionFunctionArgs, LoaderFunctionArgs } from 'react-router';
import { Button } from '../../components/Button';
import { StatusBadge } from '../../components/StatusBadge';
import { TextField } from '../../components/TextField';
import { toUserMessage } from '../../lib/apiClient';
import {
  createTestCase,
  fetchTestCases,
  PRIORITY_LABELS,
  type Priority,
  type TestCaseSummary,
} from './testCase.api';

type ActionResult = {
  error?: string;
};

const PRIORITIES = Object.keys(PRIORITY_LABELS) as Priority[];

const PRIORITY_TONES: Record<Priority, 'neutral' | 'progress' | 'done'> = {
  LOW: 'neutral',
  MEDIUM: 'neutral',
  HIGH: 'progress',
  CRITICAL: 'progress',
};

export function testCasesLoader({ params }: LoaderFunctionArgs): Promise<TestCaseSummary[]> {
  return fetchTestCases(params['projectId'] ?? '');
}

export async function testCasesAction({ params, request }: ActionFunctionArgs) {
  const projectId = params['projectId'] ?? '';
  const formData = await request.formData();

  try {
    // Steps are written on the test case's own page, where there is room for them.
    await createTestCase(projectId, {
      title: String(formData.get('title') ?? ''),
      priority: String(formData.get('priority') ?? 'MEDIUM') as Priority,
      requirementId: null,
      steps: [],
    });
  } catch (error) {
    return { error: toUserMessage(error, 'Could not create the test case. Try again.') };
  }

  return redirect(`/projects/${projectId}/test-cases`);
}

export function TestCasesPage() {
  const testCases = useLoaderData() as TestCaseSummary[];
  const actionResult = useActionData() as ActionResult | undefined;
  const navigation = useNavigation();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  return (
    <section>
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">Test cases</h2>
        <Button onClick={() => setIsDialogOpen(true)}>New test case</Button>
      </div>

      {testCases.length === 0 ? (
        <p className="mt-6 rounded-lg border border-dashed border-border px-4 py-10 text-center text-sm text-ink-muted">
          No test cases yet. A test case describes how something is checked, step by step.
        </p>
      ) : (
        <table className="mt-4 w-full text-sm">
          <caption className="sr-only">Test cases in this project</caption>
          <thead>
            <tr className="text-left text-ink-muted">
              <th scope="col" className="pb-2 font-medium">
                Title
              </th>
              <th scope="col" className="pb-2 font-medium">
                Priority
              </th>
              <th scope="col" className="pb-2 font-medium">
                Requirement
              </th>
            </tr>
          </thead>
          <tbody>
            {testCases.map((testCase) => (
              <tr key={testCase.id} className="border-t border-border">
                <td className="py-2">
                  <Link to={testCase.id} className="font-medium hover:underline">
                    {testCase.title}
                  </Link>
                </td>
                <td className="py-2">
                  <StatusBadge
                    label={PRIORITY_LABELS[testCase.priority]}
                    tone={PRIORITY_TONES[testCase.priority]}
                  />
                </td>
                <td className="py-2 text-ink-muted">
                  {testCase.requirement === null ? '—' : testCase.requirement.title}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <ModalOverlay
        isOpen={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        isDismissable
        className="fixed inset-0 flex items-start justify-center bg-black/20 p-4 pt-24"
      >
        <Modal className="w-full max-w-sm rounded-lg border border-border bg-surface p-5 shadow-lg">
          <Dialog className="outline-none">
            <Heading slot="title" className="text-base font-semibold">
              New test case
            </Heading>

            <Form method="post" className="mt-4 space-y-4">
              {actionResult?.error === undefined ? null : (
                <p
                  role="alert"
                  className="rounded-md border border-danger-border bg-danger-surface px-3 py-2 text-sm text-danger"
                >
                  {actionResult.error}
                </p>
              )}

              <TextField label="Title" name="title" required />

              <div>
                <label htmlFor="new-test-case-priority" className="block text-sm font-medium">
                  Priority
                </label>
                <select
                  id="new-test-case-priority"
                  name="priority"
                  defaultValue="MEDIUM"
                  className="mt-1 h-9 w-full rounded-md border border-border bg-surface px-2 text-sm"
                >
                  {PRIORITIES.map((priority) => (
                    <option key={priority} value={priority}>
                      {PRIORITY_LABELS[priority]}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="secondary" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>

                <Button type="submit" disabled={navigation.state === 'submitting'}>
                  Create test case
                </Button>
              </div>
            </Form>
          </Dialog>
        </Modal>
      </ModalOverlay>
    </section>
  );
}
