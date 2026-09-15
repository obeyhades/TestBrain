import { Form, redirect, useActionData, useLoaderData, useNavigation } from 'react-router';
import type { ActionFunctionArgs, LoaderFunctionArgs } from 'react-router';
import { Button } from '../../components/Button';
import { TextField } from '../../components/TextField';
import { toUserMessage } from '../../lib/apiClient';
import {
  deleteRequirement,
  fetchRequirement,
  REQUIREMENT_STATUS_LABELS,
  updateRequirement,
  type Requirement,
  type RequirementStatus,
} from './requirement.api';

type ActionResult = {
  error?: string;
  saved?: boolean;
};

const STATUSES = Object.keys(REQUIREMENT_STATUS_LABELS) as RequirementStatus[];

export function requirementLoader({ params }: LoaderFunctionArgs): Promise<Requirement> {
  return fetchRequirement(params['projectId'] ?? '', params['requirementId'] ?? '');
}

export async function requirementAction({ params, request }: ActionFunctionArgs) {
  const projectId = params['projectId'] ?? '';
  const requirementId = params['requirementId'] ?? '';
  const formData = await request.formData();

  if (String(formData.get('intent') ?? '') === 'delete') {
    try {
      await deleteRequirement(projectId, requirementId);
    } catch (error) {
      return { error: toUserMessage(error, 'Could not delete the requirement.') };
    }

    return redirect(`/projects/${projectId}/requirements`);
  }

  const description = String(formData.get('description') ?? '').trim();

  try {
    await updateRequirement(projectId, requirementId, {
      title: String(formData.get('title') ?? ''),
      status: String(formData.get('status') ?? 'DRAFT') as RequirementStatus,
      ...(description === '' ? {} : { description }),
    });
  } catch (error) {
    return { error: toUserMessage(error, 'Could not save the requirement.') };
  }

  return { saved: true };
}

export function RequirementDetailPage() {
  const requirement = useLoaderData() as Requirement;
  const actionResult = useActionData() as ActionResult | undefined;
  const navigation = useNavigation();
  const isSubmitting = navigation.state === 'submitting';

  return (
    <section className="max-w-xl">
      <Form method="post" className="space-y-4" key={requirement.id}>
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

        <TextField label="Title" name="title" required defaultValue={requirement.title} />

        <TextField
          label="Description"
          name="description"
          defaultValue={requirement.description ?? ''}
        />

        <div>
          <label htmlFor="requirement-status" className="block text-sm font-medium">
            Status
          </label>
          <select
            id="requirement-status"
            name="status"
            defaultValue={requirement.status}
            className="mt-1 h-9 w-full rounded-md border border-border bg-surface px-2 text-sm"
          >
            {STATUSES.map((status) => (
              <option key={status} value={status}>
                {REQUIREMENT_STATUS_LABELS[status]}
              </option>
            ))}
          </select>
        </div>

        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving…' : 'Save'}
        </Button>
      </Form>

      <Form method="post" className="mt-8 border-t border-border pt-4">
        <input type="hidden" name="intent" value="delete" />
        <Button type="submit" variant="secondary" disabled={isSubmitting}>
          Delete requirement
        </Button>
      </Form>
    </section>
  );
}
