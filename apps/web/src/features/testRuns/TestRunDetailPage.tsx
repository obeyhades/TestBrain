import { Form, useActionData, useLoaderData, useNavigation } from 'react-router';
import type { ActionFunctionArgs, LoaderFunctionArgs } from 'react-router';
import { Button } from '../../components/Button';
import { toUserMessage } from '../../lib/apiClient';
import { fetchTestCases, type TestCaseSummary } from '../testCases/testCase.api';
import { TestRunSummaryBar } from './TestRunSummaryBar';
import {
  addTestCasesToRun,
  fetchTestRun,
  recordTestResult,
  removeTestCaseFromRun,
  RESULT_STATUS_LABELS,
  setTestRunCompleted,
  type TestResultStatus,
  type TestRunDetail,
} from './testRun.api';

type LoaderData = {
  testRun: TestRunDetail;
  availableTestCases: TestCaseSummary[];
};

type ActionResult = {
  error?: string;
};

const RECORDABLE: TestResultStatus[] = ['PASSED', 'FAILED', 'BLOCKED'];

export async function testRunLoader({ params }: LoaderFunctionArgs): Promise<LoaderData> {
  const projectId = params['projectId'] ?? '';

  const [testRun, testCases] = await Promise.all([
    fetchTestRun(projectId, params['testRunId'] ?? ''),
    fetchTestCases(projectId),
  ]);

  const alreadyInRun = new Set(testRun.results.map((result) => result.testCaseId));

  return {
    testRun,
    availableTestCases: testCases.filter((testCase) => !alreadyInRun.has(testCase.id)),
  };
}

/** One route, four things somebody can do, told apart by a hidden intent field. */
export async function testRunAction({ params, request }: ActionFunctionArgs) {
  const projectId = params['projectId'] ?? '';
  const testRunId = params['testRunId'] ?? '';
  const formData = await request.formData();
  const intent = String(formData.get('intent') ?? '');

  try {
    if (intent === 'record') {
      const notes = String(formData.get('notes') ?? '').trim();

      await recordTestResult(projectId, testRunId, String(formData.get('testCaseId') ?? ''), {
        status: String(formData.get('status') ?? 'NOT_RUN') as TestResultStatus,
        ...(notes === '' ? {} : { notes }),
      });
    } else if (intent === 'add') {
      await addTestCasesToRun(projectId, testRunId, formData.getAll('testCaseId').map(String));
    } else if (intent === 'remove') {
      await removeTestCaseFromRun(projectId, testRunId, String(formData.get('testCaseId') ?? ''));
    } else if (intent === 'complete' || intent === 'reopen') {
      await setTestRunCompleted(projectId, testRunId, intent === 'complete');
    }
  } catch (error) {
    return { error: toUserMessage(error, 'Could not update the test run.') };
  }

  return null;
}

export function TestRunDetailPage() {
  const { testRun, availableTestCases } = useLoaderData() as LoaderData;
  const actionResult = useActionData() as ActionResult | undefined;
  const navigation = useNavigation();
  const isBusy = navigation.state === 'submitting';

  return (
    <section className="space-y-6">
      {actionResult?.error === undefined ? null : (
        <p
          role="alert"
          className="rounded-md border border-danger-border bg-danger-surface px-3 py-2 text-sm text-danger"
        >
          {actionResult.error}
        </p>
      )}

      <div className="rounded-lg border border-border bg-surface p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">{testRun.name}</h2>

          <Form method="post">
            <input
              type="hidden"
              name="intent"
              value={testRun.status === 'COMPLETED' ? 'reopen' : 'complete'}
            />
            <Button type="submit" variant="secondary" disabled={isBusy}>
              {testRun.status === 'COMPLETED' ? 'Reopen run' : 'Mark complete'}
            </Button>
          </Form>
        </div>

        <div className="mt-3">
          <TestRunSummaryBar summary={testRun.summary} />
        </div>
      </div>

      {testRun.results.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border px-4 py-10 text-center text-sm text-ink-muted">
          No test cases in this run yet. Add some below.
        </p>
      ) : (
        <table className="w-full text-sm">
          <caption className="sr-only">Test cases in this run</caption>
          <thead>
            <tr className="text-left text-ink-muted">
              <th scope="col" className="pb-2 font-medium">
                Test case
              </th>
              <th scope="col" className="pb-2 font-medium">
                Result
              </th>
              <th scope="col" className="pb-2">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {testRun.results.map((result) => (
              <tr key={result.testCaseId} className="border-t border-border align-top">
                <td className="py-2">
                  <span className="font-medium">{result.title}</span>
                  {result.executedBy === null ? null : (
                    <span className="mt-0.5 block text-xs text-ink-muted">
                      {RESULT_STATUS_LABELS[result.status]} by {result.executedBy}
                    </span>
                  )}
                </td>

                <td className="py-2">
                  <Form method="post" className="flex gap-1">
                    <input type="hidden" name="intent" value="record" />
                    <input type="hidden" name="testCaseId" value={result.testCaseId} />

                    {RECORDABLE.map((status) => (
                      <button
                        key={status}
                        type="submit"
                        name="status"
                        value={status}
                        disabled={isBusy}
                        aria-pressed={result.status === status}
                        className={`h-7 rounded border px-2 text-xs font-medium ${
                          result.status === status
                            ? 'border-ink bg-ink text-white'
                            : 'border-border bg-surface hover:bg-canvas'
                        }`}
                      >
                        {RESULT_STATUS_LABELS[status]}
                      </button>
                    ))}
                  </Form>
                </td>

                <td className="py-2 text-right">
                  <Form method="post">
                    <input type="hidden" name="intent" value="remove" />
                    <input type="hidden" name="testCaseId" value={result.testCaseId} />
                    <Button type="submit" variant="secondary" disabled={isBusy}>
                      Remove
                    </Button>
                  </Form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {availableTestCases.length === 0 ? null : (
        <Form method="post" className="max-w-md rounded-lg border border-border p-4">
          <h3 className="text-sm font-semibold">Add test cases</h3>

          <input type="hidden" name="intent" value="add" />

          <fieldset className="mt-3 space-y-2">
            <legend className="sr-only">Test cases not yet in this run</legend>

            {availableTestCases.map((testCase) => (
              <label key={testCase.id} className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="testCaseId" value={testCase.id} />
                {testCase.title}
              </label>
            ))}
          </fieldset>

          <div className="mt-3">
            <Button type="submit" disabled={isBusy}>
              Add to run
            </Button>
          </div>
        </Form>
      )}
    </section>
  );
}
