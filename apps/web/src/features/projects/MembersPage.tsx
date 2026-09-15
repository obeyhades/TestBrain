import { Form, useActionData, useLoaderData, useNavigation } from 'react-router';
import type { ActionFunctionArgs, LoaderFunctionArgs } from 'react-router';
import { Button } from '../../components/Button';
import { TextField } from '../../components/TextField';
import { toUserMessage } from '../../lib/apiClient';
import {
  addProjectMember,
  fetchProjectMembers,
  PROJECT_ROLE_LABELS,
  removeProjectMember,
  updateProjectMemberRole,
  type ProjectMember,
  type ProjectRole,
} from './project.api';

type MembersActionResult = {
  error?: string;
};

const ROLES = Object.keys(PROJECT_ROLE_LABELS) as ProjectRole[];

export function membersLoader({ params }: LoaderFunctionArgs): Promise<ProjectMember[]> {
  return fetchProjectMembers(params['projectId'] ?? '');
}

/**
 * One route, three things somebody can do. A hidden "intent" field says which,
 * which keeps the branching visible in one place instead of spread across three
 * endpoints that all mean "change the members of this project".
 */
export async function membersAction({ params, request }: ActionFunctionArgs) {
  const projectId = params['projectId'] ?? '';
  const formData = await request.formData();
  const intent = String(formData.get('intent') ?? '');

  try {
    if (intent === 'add') {
      await addProjectMember(projectId, {
        email: String(formData.get('email') ?? ''),
        role: String(formData.get('role') ?? '') as ProjectRole,
      });
    } else if (intent === 'changeRole') {
      await updateProjectMemberRole(
        projectId,
        String(formData.get('userId') ?? ''),
        String(formData.get('role') ?? '') as ProjectRole,
      );
    } else if (intent === 'remove') {
      await removeProjectMember(projectId, String(formData.get('userId') ?? ''));
    }
  } catch (error) {
    return { error: toUserMessage(error, 'Could not update the members. Try again.') };
  }

  return null;
}

export function MembersPage() {
  const members = useLoaderData() as ProjectMember[];
  const actionResult = useActionData() as MembersActionResult | undefined;
  const navigation = useNavigation();
  const isBusy = navigation.state === 'submitting';

  return (
    <div className="space-y-6">
      {actionResult?.error === undefined ? null : (
        <p
          role="alert"
          className="rounded-md border border-danger-border bg-danger-surface px-3 py-2 text-sm text-danger"
        >
          {actionResult.error}
        </p>
      )}

      <table className="w-full border-separate border-spacing-0 text-sm">
        <caption className="sr-only">People in this project</caption>
        <thead>
          <tr className="text-left text-ink-muted">
            <th scope="col" className="pb-2 font-medium">
              Name
            </th>
            <th scope="col" className="pb-2 font-medium">
              Email
            </th>
            <th scope="col" className="pb-2 font-medium">
              Role
            </th>
            <th scope="col" className="pb-2">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {members.map((member) => (
            <tr key={member.userId} className="border-t border-border">
              <td className="py-2 font-medium">{member.name}</td>
              <td className="py-2 text-ink-muted">{member.email}</td>
              <td className="py-2">
                <Form method="post">
                  <input type="hidden" name="intent" value="changeRole" />
                  <input type="hidden" name="userId" value={member.userId} />
                  <select
                    name="role"
                    defaultValue={member.role}
                    aria-label={`Role for ${member.name}`}
                    onChange={(event) => event.currentTarget.form?.requestSubmit()}
                    className="h-8 rounded-md border border-border bg-surface px-2 text-sm"
                  >
                    {ROLES.map((role) => (
                      <option key={role} value={role}>
                        {PROJECT_ROLE_LABELS[role]}
                      </option>
                    ))}
                  </select>
                </Form>
              </td>
              <td className="py-2 text-right">
                <Form method="post">
                  <input type="hidden" name="intent" value="remove" />
                  <input type="hidden" name="userId" value={member.userId} />
                  <Button type="submit" variant="secondary" disabled={isBusy}>
                    Remove
                  </Button>
                </Form>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <Form method="post" className="max-w-md space-y-3 rounded-lg border border-border p-4">
        <h2 className="text-sm font-semibold">Add a member</h2>

        <input type="hidden" name="intent" value="add" />

        <TextField
          label="Email"
          name="email"
          type="email"
          required
          hint="The person needs an account on this instance already."
        />

        <div>
          <label htmlFor="new-member-role" className="block text-sm font-medium">
            Role
          </label>
          <select
            id="new-member-role"
            name="role"
            defaultValue="QA"
            className="mt-1 h-9 w-full rounded-md border border-border bg-surface px-2 text-sm"
          >
            {ROLES.map((role) => (
              <option key={role} value={role}>
                {PROJECT_ROLE_LABELS[role]}
              </option>
            ))}
          </select>
        </div>

        <Button type="submit" disabled={isBusy}>
          Add member
        </Button>
      </Form>
    </div>
  );
}
