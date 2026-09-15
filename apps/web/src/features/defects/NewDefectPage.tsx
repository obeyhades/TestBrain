import {
  Form,
  redirect,
  useActionData,
  useLoaderData,
  useNavigation,
  useSearchParams,
} from 'react-router';
import type { ActionFunctionArgs, LoaderFunctionArgs } from 'react-router';
import { Button } from '../../components/Button';
import { toUserMessage } from '../../lib/apiClient';
import { fetchProjectMembers, type ProjectMember } from '../projects/project.api';
import { fetchTestCases, type TestCaseSummary } from '../testCases/testCase.api';
import { fetchTestRuns, type TestRunListItem } from '../testRuns/testRun.api';
import { DefectFields } from './DefectFields';
import { createDefect, readDefectFromForm } from './defect.api';

type LoaderData = {
  testCases: TestCaseSummary[];
  testRuns: TestRunListItem[];
  members: ProjectMember[];
};

type ActionResult = {
  error?: string;
};

export async function newDefectLoader({ params }: LoaderFunctionArgs): Promise<LoaderData> {
  const projectId = params['projectId'] ?? '';

  const [testCases, testRuns, members] = await Promise.all([
    fetchTestCases(projectId),
    fetchTestRuns(projectId),
    fetchProjectMembers(projectId),
  ]);

  return { testCases, testRuns, members };
}

export async function newDefectAction({ params, request }: ActionFunctionArgs) {
  const projectId = params['projectId'] ?? '';

  try {
    const defect = await createDefect(projectId, readDefectFromForm(await request.formData()));

    return redirect(`/projects/${projectId}/defects/${defect.id}`);
  } catch (error) {
    return { error: toUserMessage(error, 'Could not report the defect. Try again.') };
  }
}

export function NewDefectPage() {
  const { testCases, testRuns, members } = useLoaderData() as LoaderData;
  const actionResult = useActionData() as ActionResult | undefined;
  const navigation = useNavigation();
  const [searchParams] = useSearchParams();

  // Reporting a defect from a failed test arrives here with the test already
  // chosen, so nobody has to remember which one they were just looking at.
  const defaults = {
    title: searchParams.get('title') ?? '',
    testCaseId: searchParams.get('testCaseId') ?? '',
    testRunId: searchParams.get('testRunId') ?? '',
  };

  return (
    <section className="max-w-3xl">
      <h2 className="text-sm font-semibold">Report a defect</h2>

      <Form method="post" className="mt-4 space-y-4">
        {actionResult?.error === undefined ? null : (
          <p
            role="alert"
            className="rounded-md border border-danger-border bg-danger-surface px-3 py-2 text-sm text-danger"
          >
            {actionResult.error}
          </p>
        )}

        <DefectFields
          defaults={defaults}
          testCases={testCases}
          testRuns={testRuns}
          members={members}
        />

        <Button type="submit" disabled={navigation.state === 'submitting'}>
          Report defect
        </Button>
      </Form>
    </section>
  );
}
