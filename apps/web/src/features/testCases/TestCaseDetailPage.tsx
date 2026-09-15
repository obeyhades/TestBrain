import { Form, redirect, useActionData, useLoaderData, useNavigation } from 'react-router';
import type { ActionFunctionArgs, LoaderFunctionArgs } from 'react-router';
import { Button } from '../../components/Button';
import { TextField } from '../../components/TextField';
import { toUserMessage } from '../../lib/apiClient';
import { fetchRequirements, type Requirement } from '../requirements/requirement.api';
import { TestStepEditor } from './TestStepEditor';
import {
  deleteTestCase,
  fetchTestCase,
  PRIORITY_LABELS,
  readStepsFromForm,
  updateTestCase,
  type Priority,
  type TestCaseDetail,
} from './testCase.api';

type LoaderData = {
  testCase: TestCaseDetail;
  requirements: Requirement[];
};

type ActionResult = {
  error?: string;
  saved?: boolean;
};

const PRIORITIES = Object.keys(PRIORITY_LABELS) as Priority[];

export async function testCaseLoader({ params }: LoaderFunctionArgs): Promise<LoaderData> {
  const projectId = params['projectId'] ?? '';

  // The requirement list is needed to offer something to link this test to.
  const [testCase, requirements] = await Promise.all([
    fetchTestCase(projectId, params['testCaseId'] ?? ''),
    fetchRequirements(projectId),
  ]);

  return { testCase, requirements };
}

export async function testCaseAction({ params, request }: ActionFunctionArgs) {
  const projectId = params['projectId'] ?? '';
  const testCaseId = params['testCaseId'] ?? '';
  const formData = await request.formData();

  if (String(formData.get('intent') ?? '') === 'delete') {
    try {
      await deleteTestCase(projectId, testCaseId);
    } catch (error) {
      return { error: toUserMessage(error, 'Could not delete the test case.') };
    }

    return redirect(`/projects/${projectId}/test-cases`);
  }

  const requirementId = String(formData.get('requirementId') ?? '');
  const description = String(formData.get('description') ?? '').trim();
  const preconditions = String(formData.get('preconditions') ?? '').trim();

  try {
    await updateTestCase(projectId, testCaseId, {
      title: String(formData.get('title') ?? ''),
      priority: String(formData.get('priority') ?? 'MEDIUM') as Priority,
      requirementId: requirementId === '' ? null : requirementId,
      steps: readStepsFromForm(formData),
      ...(description === '' ? {} : { description }),
      ...(preconditions === '' ? {} : { preconditions }),
    });
  } catch (error) {
    return { error: toUserMessage(error, 'Could not save the test case.') };
  }

  return { saved: true };
}

export function TestCaseDetailPage() {
  const { testCase, requirements } = useLoaderData() as LoaderData;
  const actionResult = useActionData() as ActionResult | undefined;
  const navigation = useNavigation();
  const isSubmitting = navigation.state === 'submitting';

  return (
    <section className="max-w-3xl">
      <Form method="post" className="space-y-4" key={testCase.id}>
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

        <TextField label="Title" name="title" required defaultValue={testCase.title} />

        <TextField
          label="Description"
          name="description"
          defaultValue={testCase.description ?? ''}
        />

        <TextField
          label="Preconditions"
          name="preconditions"
          defaultValue={testCase.preconditions ?? ''}
          hint="What has to be true before these steps make sense."
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="test-case-priority" className="block text-sm font-medium">
              Priority
            </label>
            <select
              id="test-case-priority"
              name="priority"
              defaultValue={testCase.priority}
              className="mt-1 h-9 w-full rounded-md border border-border bg-surface px-2 text-sm"
            >
              {PRIORITIES.map((priority) => (
                <option key={priority} value={priority}>
                  {PRIORITY_LABELS[priority]}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="test-case-requirement" className="block text-sm font-medium">
              Verifies requirement
            </label>
            <select
              id="test-case-requirement"
              name="requirementId"
              defaultValue={testCase.requirement?.id ?? ''}
              className="mt-1 h-9 w-full rounded-md border border-border bg-surface px-2 text-sm"
            >
              <option value="">Not linked</option>
              {requirements.map((requirement) => (
                <option key={requirement.id} value={requirement.id}>
                  {requirement.title}
                </option>
              ))}
            </select>
          </div>
        </div>

        <TestStepEditor steps={testCase.steps} />

        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving…' : 'Save'}
        </Button>
      </Form>

      <Form method="post" className="mt-8 border-t border-border pt-4">
        <input type="hidden" name="intent" value="delete" />
        <Button type="submit" variant="secondary" disabled={isSubmitting}>
          Delete test case
        </Button>
      </Form>
    </section>
  );
}
