import { useState } from 'react';
import { Dialog, Heading, Modal, ModalOverlay } from 'react-aria-components';
import { Form, Link, redirect, useActionData, useLoaderData, useNavigation } from 'react-router';
import type { ActionFunctionArgs, LoaderFunctionArgs } from 'react-router';
import { Button } from '../../components/Button';
import { StatusBadge } from '../../components/StatusBadge';
import { TextField } from '../../components/TextField';
import { toUserMessage } from '../../lib/apiClient';
import {
  createRequirement,
  fetchRequirements,
  REQUIREMENT_STATUS_LABELS,
  type Requirement,
  type RequirementStatus,
} from './requirement.api';

type ActionResult = {
  error?: string;
};

const STATUS_TONES: Record<RequirementStatus, 'neutral' | 'progress' | 'done'> = {
  DRAFT: 'neutral',
  APPROVED: 'progress',
  IMPLEMENTED: 'done',
};

const STATUSES = Object.keys(REQUIREMENT_STATUS_LABELS) as RequirementStatus[];

export function requirementsLoader({ params }: LoaderFunctionArgs): Promise<Requirement[]> {
  return fetchRequirements(params['projectId'] ?? '');
}

export async function requirementsAction({ params, request }: ActionFunctionArgs) {
  const projectId = params['projectId'] ?? '';
  const formData = await request.formData();
  const description = String(formData.get('description') ?? '').trim();

  try {
    await createRequirement(projectId, {
      title: String(formData.get('title') ?? ''),
      status: String(formData.get('status') ?? 'DRAFT') as RequirementStatus,
      ...(description === '' ? {} : { description }),
    });
  } catch (error) {
    return { error: toUserMessage(error, 'Could not create the requirement. Try again.') };
  }

  // Redirecting back to the same list closes the dialog by remounting the page,
  // and picks up the new row on the way.
  return redirect(`/projects/${projectId}/requirements`);
}

export function RequirementsPage() {
  const requirements = useLoaderData() as Requirement[];
  const actionResult = useActionData() as ActionResult | undefined;
  const navigation = useNavigation();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  return (
    <section>
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">Requirements</h2>
        <Button onClick={() => setIsDialogOpen(true)}>New requirement</Button>
      </div>

      {requirements.length === 0 ? (
        <p className="mt-6 rounded-lg border border-dashed border-border px-4 py-10 text-center text-sm text-ink-muted">
          No requirements yet. Write down what the product is supposed to do, then cover it with
          test cases.
        </p>
      ) : (
        <table className="mt-4 w-full text-sm">
          <caption className="sr-only">Requirements in this project</caption>
          <thead>
            <tr className="text-left text-ink-muted">
              <th scope="col" className="pb-2 font-medium">
                Title
              </th>
              <th scope="col" className="pb-2 font-medium">
                Status
              </th>
            </tr>
          </thead>
          <tbody>
            {requirements.map((requirement) => (
              <tr key={requirement.id} className="border-t border-border">
                <td className="py-2">
                  <Link
                    to={requirement.id}
                    className="font-medium hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                  >
                    {requirement.title}
                  </Link>
                </td>
                <td className="py-2">
                  <StatusBadge
                    label={REQUIREMENT_STATUS_LABELS[requirement.status]}
                    tone={STATUS_TONES[requirement.status]}
                  />
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
              New requirement
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

              <TextField label="Description" name="description" />

              <div>
                <label htmlFor="new-requirement-status" className="block text-sm font-medium">
                  Status
                </label>
                <select
                  id="new-requirement-status"
                  name="status"
                  defaultValue="DRAFT"
                  className="mt-1 h-9 w-full rounded-md border border-border bg-surface px-2 text-sm"
                >
                  {STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {REQUIREMENT_STATUS_LABELS[status]}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="secondary" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>

                <Button type="submit" disabled={navigation.state === 'submitting'}>
                  Create requirement
                </Button>
              </div>
            </Form>
          </Dialog>
        </Modal>
      </ModalOverlay>
    </section>
  );
}
