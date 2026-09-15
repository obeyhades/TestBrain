import { Form, redirect, useActionData, useNavigation } from 'react-router';
import type { ActionFunctionArgs } from 'react-router';
import { Button } from '../../components/Button';
import { TextField } from '../../components/TextField';
import { toUserMessage } from '../../lib/apiClient';
import { fetchCurrentUser } from '../auth/auth.api';
import { createUser } from './user.api';

type CreateUserResult = {
  error?: string;
  createdName?: string;
};

/**
 * Only instance administrators can create accounts. This check is for the person
 * looking at the screen; the API refuses everybody else regardless.
 */
export async function createUserLoader(): Promise<null> {
  const user = await fetchCurrentUser();

  if (user === null) {
    throw redirect('/login');
  }

  if (!user.isInstanceAdmin) {
    throw redirect('/projects');
  }

  return null;
}

export async function createUserAction({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const name = String(formData.get('name') ?? '');

  try {
    await createUser({
      email: String(formData.get('email') ?? ''),
      name,
      password: String(formData.get('password') ?? ''),
    });
  } catch (error) {
    return { error: toUserMessage(error, 'Could not create the account. Try again.') };
  }

  return { createdName: name };
}

export function CreateUserPage() {
  const result = useActionData() as CreateUserResult | undefined;
  const navigation = useNavigation();
  const isSubmitting = navigation.state === 'submitting';

  return (
    <section className="max-w-md">
      <h1 className="text-lg font-semibold">New account</h1>
      <p className="mt-1 text-sm text-ink-muted">
        Create an account for a colleague so they can be added to projects.
      </p>

      <Form method="post" className="mt-6 space-y-4 rounded-lg border border-border p-4">
        {result?.error === undefined ? null : (
          <p
            role="alert"
            className="rounded-md border border-danger-border bg-danger-surface px-3 py-2 text-sm text-danger"
          >
            {result.error}
          </p>
        )}

        {result?.createdName === undefined ? null : (
          <p role="status" className="rounded-md border border-border bg-canvas px-3 py-2 text-sm">
            Created an account for {result.createdName}.
          </p>
        )}

        <TextField label="Name" name="name" required />

        <TextField label="Email" name="email" type="email" required />

        <TextField
          label="Password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          hint="At least 12 characters. Share it with them, they can keep using it."
        />

        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Creating…' : 'Create account'}
        </Button>
      </Form>
    </section>
  );
}
