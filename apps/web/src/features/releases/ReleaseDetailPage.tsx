import { Form, useActionData, useLoaderData, useNavigation } from 'react-router';
import type { ActionFunctionArgs, LoaderFunctionArgs } from 'react-router';
import { Button } from '../../components/Button';
import { toUserMessage } from '../../lib/apiClient';
import { DEFECT_STATUS_LABELS, SEVERITY_LABELS } from '../defects/defect.api';
import { fetchTestRuns, type TestRunListItem } from '../testRuns/testRun.api';
import { ReleaseFields } from './ReleaseFields';
import { ReleaseReadiness } from './ReleaseReadiness';
import {
  fetchRelease,
  readReleaseFromForm,
  setReleaseTestRuns,
  updateRelease,
  type ReleaseDetail,
} from './release.api';

type LoaderData = {
  release: ReleaseDetail;
  testRuns: TestRunListItem[];
};

type ActionResult = {
  error?: string;
  saved?: boolean;
};

export async function releaseLoader({ params }: LoaderFunctionArgs): Promise<LoaderData> {
  const projectId = params['projectId'] ?? '';

  const [release, testRuns] = await Promise.all([
    fetchRelease(projectId, params['releaseId'] ?? ''),
    fetchTestRuns(projectId),
  ]);

  return { release, testRuns };
}

export async function releaseAction({ params, request }: ActionFunctionArgs) {
  const projectId = params['projectId'] ?? '';
  const releaseId = params['releaseId'] ?? '';
  const formData = await request.formData();

  try {
    if (String(formData.get('intent') ?? '') === 'testRuns') {
      await setReleaseTestRuns(projectId, releaseId, formData.getAll('testRunId').map(String));
    } else {
      await updateRelease(projectId, releaseId, readReleaseFromForm(formData));
    }
  } catch (error) {
    return { error: toUserMessage(error, 'Could not save the release.') };
  }

  return { saved: true };
}

export function ReleaseDetailPage() {
  const { release, testRuns } = useLoaderData() as LoaderData;
  const actionResult = useActionData() as ActionResult | undefined;
  const navigation = useNavigation();
  const isBusy = navigation.state === 'submitting';

  const chosenRuns = new Set(release.testRuns.map((testRun) => testRun.id));

  return (
    <section className="max-w-3xl space-y-6">
      {actionResult?.error === undefined ? null : (
        <p
          role="alert"
          className="rounded-md border border-danger-border bg-danger-surface px-3 py-2 text-sm text-danger"
        >
          {actionResult.error}
        </p>
      )}

      <ReleaseReadiness quality={release.quality} />

      {release.defects.length === 0 ? null : (
        <div>
          <h3 className="text-sm font-semibold">Defects found in this release</h3>

          <div className="overflow-x-auto mt-2">
            <table className="w-full text-sm">
              <caption className="sr-only">Defects reported against this release</caption>
              <thead>
                <tr className="text-left text-ink-muted">
                  <th scope="col" className="pb-2 font-medium">
                    Title
                  </th>
                  <th scope="col" className="pb-2 font-medium">
                    Severity
                  </th>
                  <th scope="col" className="pb-2 font-medium">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {release.defects.map((defect) => (
                  <tr key={defect.id} className="border-t border-border">
                    <td className="py-2">{defect.title}</td>
                    <td className="py-2">{SEVERITY_LABELS[defect.severity]}</td>
                    <td className="py-2 text-ink-muted">{DEFECT_STATUS_LABELS[defect.status]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Form method="post" className="rounded-lg border border-border p-4">
        <h3 className="text-sm font-semibold">Test runs that validate this release</h3>

        <input type="hidden" name="intent" value="testRuns" />

        {testRuns.length === 0 ? (
          <p className="mt-2 text-sm text-ink-muted">This project has no test runs yet.</p>
        ) : (
          <fieldset className="mt-3 space-y-2">
            <legend className="sr-only">Test runs in this project</legend>

            {testRuns.map((testRun) => (
              <label key={testRun.id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="testRunId"
                  value={testRun.id}
                  defaultChecked={chosenRuns.has(testRun.id)}
                />
                {testRun.name}
                <span className="text-xs text-ink-muted">
                  ({testRun.summary.passed}/{testRun.summary.total} passed)
                </span>
              </label>
            ))}
          </fieldset>
        )}

        <div className="mt-3">
          <Button type="submit" disabled={isBusy}>
            Save test runs
          </Button>
        </div>
      </Form>

      <Form method="post" className="space-y-4" key={release.id}>
        {actionResult?.saved === true ? (
          <p role="status" className="rounded-md border border-border bg-canvas px-3 py-2 text-sm">
            Saved.
          </p>
        ) : null}

        <ReleaseFields release={release} />

        <Button type="submit" disabled={isBusy}>
          {isBusy ? 'Saving…' : 'Save release'}
        </Button>
      </Form>
    </section>
  );
}
