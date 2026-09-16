import { useState } from 'react';
import { Dialog, Heading, Modal, ModalOverlay } from 'react-aria-components';
import { Form, Link, redirect, useActionData, useLoaderData, useNavigation } from 'react-router';
import type { ActionFunctionArgs, LoaderFunctionArgs } from 'react-router';
import { Button } from '../../components/Button';
import { StatusBadge } from '../../components/StatusBadge';
import { TextField } from '../../components/TextField';
import { toUserMessage } from '../../lib/apiClient';
import { TestRunSummaryBar } from './TestRunSummaryBar';
import { createTestRun, fetchTestRuns, type TestRunListItem } from './testRun.api';

type ActionResult = {
  error?: string;
};

export function testRunsLoader({ params }: LoaderFunctionArgs): Promise<TestRunListItem[]> {
  return fetchTestRuns(params['projectId'] ?? '');
}

export async function testRunsAction({ params, request }: ActionFunctionArgs) {
  const projectId = params['projectId'] ?? '';
  const formData = await request.formData();

  try {
    const run = await createTestRun(projectId, String(formData.get('name') ?? ''));

    return redirect(`/projects/${projectId}/test-runs/${run.id}`);
  } catch (error) {
    return { error: toUserMessage(error, 'Could not create the test run. Try again.') };
  }
}

export function TestRunsPage() {
  const testRuns = useLoaderData() as TestRunListItem[];
  const actionResult = useActionData() as ActionResult | undefined;
  const navigation = useNavigation();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  return (
    <section>
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">Test runs</h2>
        <Button onClick={() => setIsDialogOpen(true)}>New test run</Button>
      </div>

      {testRuns.length === 0 ? (
        <p className="mt-6 rounded-lg border border-dashed border-border px-4 py-10 text-center text-sm text-ink-muted">
          No test runs yet. A run is one round of testing, such as "Regression - v1.4.0".
        </p>
      ) : (
        <ul className="mt-4 space-y-3">
          {testRuns.map((testRun) => (
            <li key={testRun.id}>
              {/* The whole card is the link. When only the name was clickable, the status
                  badge on the right was mistaken for an "Open" button that did nothing. */}
              <Link
                to={testRun.id}
                className="block rounded-lg border border-border bg-surface p-4 hover:border-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-medium">{testRun.name}</span>

                  <StatusBadge
                    label={testRun.status === 'COMPLETED' ? 'Completed' : 'In progress'}
                    tone={testRun.status === 'COMPLETED' ? 'done' : 'progress'}
                  />
                </div>

                <div className="mt-3">
                  <TestRunSummaryBar summary={testRun.summary} />
                </div>
              </Link>
            </li>
          ))}
        </ul>
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
              New test run
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

              <TextField
                label="Name"
                name="name"
                required
                hint="For example: Regression - v1.4.0"
              />

              <div className="flex justify-end gap-2">
                <Button variant="secondary" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>

                <Button type="submit" disabled={navigation.state === 'submitting'}>
                  Create test run
                </Button>
              </div>
            </Form>
          </Dialog>
        </Modal>
      </ModalOverlay>
    </section>
  );
}
