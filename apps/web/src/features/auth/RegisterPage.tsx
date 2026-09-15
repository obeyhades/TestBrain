import { Form, redirect, useActionData, useNavigation } from 'react-router';
import type { ActionFunctionArgs } from 'react-router';
import { Button } from '../../components/Button';
import { TextField } from '../../components/TextField';
import { AuthLayout } from '../../layouts/AuthLayout';
import { toUserMessage } from '../../lib/apiClient';
import { fetchCurrentUser, fetchSetupStatus, register } from './auth.api';

type RegisterActionResult = {
  error: string;
};

export async function registerPageLoader(): Promise<null> {
  if ((await fetchCurrentUser()) !== null) {
    throw redirect('/');
  }

  // This screen creates the account that owns the instance. Once it exists there
  // is nothing here to do, so visitors go to the sign-in screen instead.
  if (!(await fetchSetupStatus()).needsSetup) {
    throw redirect('/login');
  }

  return null;
}

export async function registerAction({ request }: ActionFunctionArgs) {
  const formData = await request.formData();

  try {
    await register({
      email: String(formData.get('email') ?? ''),
      name: String(formData.get('name') ?? ''),
      password: String(formData.get('password') ?? ''),
    });
  } catch (error) {
    return { error: toUserMessage(error, 'Could not create the account. Try again.') };
  }

  return redirect('/');
}

export function RegisterPage() {
  const actionResult = useActionData() as RegisterActionResult | undefined;
  const navigation = useNavigation();
  const isSubmitting = navigation.state === 'submitting';

  return (
    <AuthLayout title="Set up TestBrain" description="This first account administers the instance.">
      <Form method="post" className="space-y-4">
        {actionResult === undefined ? null : (
          <p
            role="alert"
            className="rounded-md border border-danger-border bg-danger-surface px-3 py-2 text-sm text-danger"
          >
            {actionResult.error}
          </p>
        )}

        <TextField label="Name" name="name" autoComplete="name" required />

        <TextField label="Email" name="email" type="email" autoComplete="email" required />

        <TextField
          label="Password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          hint="At least 12 characters."
        />

        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Creating account…' : 'Create account'}
        </Button>
      </Form>
    </AuthLayout>
  );
}
