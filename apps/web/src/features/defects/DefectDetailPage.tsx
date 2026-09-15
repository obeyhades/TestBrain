import { Form, useActionData, useLoaderData, useNavigation } from 'react-router';
import type { ActionFunctionArgs, LoaderFunctionArgs } from 'react-router';
import { Button } from '../../components/Button';
import { toUserMessage } from '../../lib/apiClient';
import { fetchProjectMembers, type ProjectMember } from '../projects/project.api';
import { fetchTestCases, type TestCaseSummary } from '../testCases/testCase.api';
import { fetchTestRuns, type TestRunListItem } from '../testRuns/testRun.api';
import { DefectFields } from './DefectFields';
import {
  DEFECT_STATUS_LABELS,
  fetchDefect,
  readDefectFromForm,
  updateDefect,
  type Defect,
  type DefectStatus,
} from './defect.api';

type LoaderData = {
  defect: Defect;
  testCases: TestCaseSummary[];
  testRuns: TestRunListItem[];
  members: ProjectMember[];
};

type ActionResult = {
  error?: string;
  saved?: boolean;
};

const STATUSES = Object.keys(DEFECT_STATUS_LABELS) as DefectStatus[];

export async function defectLoader({ params }: LoaderFunctionArgs): Promise<LoaderData> {
  const projectId = params['projectId'] ?? '';

  const [defect, testCases, testRuns, members] = await Promise.all([
    fetchDefect(projectId, params['defectId'] ?? ''),
    fetchTestCases(projectId),
    fetchTestRuns(projectId),
    fetchProjectMembers(projectId),
  ]);

  return { defect, testCases, testRuns, members };
}

export async function defectAction({ params, request }: ActionFunctionArgs) {
  const projectId = params['projectId'] ?? '';
  const formData = await request.formData();

  try {
    await updateDefect(projectId, params['defectId'] ?? '', {
      ...readDefectFromForm(formData),
      status: String(formData.get('status') ?? 'OPEN') as DefectStatus,
    });
  } catch (error) {
    return { error: toUserMessage(error, 'Could not save the defect.') };
  }

  return { saved: true };
}

export function DefectDetailPage() {
  const { defect, testCases, testRuns, members } = useLoaderData() as LoaderData;
  const actionResult = useActionData() as ActionResult | undefined;
  const navigation = useNavigation();
  const isSubmitting = navigation.state === 'submitting';

  return (
    <section className="max-w-3xl">
      <p className="text-xs text-ink-muted">
        Reported by {defect.createdBy.name} on {new Date(defect.createdAt).toLocaleDateString()}
      </p>

      <Form method="post" className="mt-4 space-y-4" key={defect.id}>
        {actionResult?.error === undefined ? null : (
          <p
            role="alert"
            className="rounded-md border border-danger-border bg-danger-surface px-3 py-2 text-sm text-danger"
          >
            {actionResult.error}
          </p>
        )}

        {actionResult?.saved === true ? (
          <p role="status" className="rounded-md border border-border bg-canvas px-3 py-2 text-sm">
            Saved.
          </p>
        ) : null}

        <div>
          <label htmlFor="defect-status" className="block text-sm font-medium">
            Status
          </label>
          <select
            id="defect-status"
            name="status"
            defaultValue={defect.status}
            className="mt-1 h-9 w-full max-w-xs rounded-md border border-border bg-surface px-2 text-sm"
          >
            {STATUSES.map((status) => (
              <option key={status} value={status}>
                {DEFECT_STATUS_LABELS[status]}
              </option>
            ))}
          </select>
        </div>

        <DefectFields defect={defect} testCases={testCases} testRuns={testRuns} members={members} />

        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving…' : 'Save'}
        </Button>
      </Form>
    </section>
  );
}
