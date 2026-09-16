import { Form, Link, redirect, useActionData, useLoaderData, useNavigation } from 'react-router';
import type { ActionFunctionArgs } from 'react-router';
import { Button } from '../../components/Button';
import { TextField } from '../../components/TextField';
import { AuthLayout } from '../../layouts/AuthLayout';
import { toUserMessage } from '../../lib/apiClient';
import { fetchCurrentUser, fetchSetupStatus, register } from './auth.api';

type RegisterLoaderData = {
  needsSetup: boolean;
};

type RegisterActionResult = {
  error: string;
};

export async function registerPageLoader(): Promise<RegisterLoaderData> {
  if ((await fetchCurrentUser()) !== null) {
    throw redirect('/');
  }

  // Anybody may sign up. What changes is only the wording: the very first account
  // owns the instance, and the screen says so.
  return fetchSetupStatus();
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
  const { needsSetup } = useLoaderData() as RegisterLoaderData;
  const actionResult = useActionData() as RegisterActionResult | undefined;
  const navigation = useNavigation();
  const isSubmitting = navigation.state === 'submitting';

  return (
    <AuthLayout
      title={needsSetup ? 'Set up TestBrain' : 'Create your account'}
      description={
        needsSetup
          ? 'This first account administers the instance.'
          : 'Sign up, then ask a project administrator to add you.'
      }
    >
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
          {isSubmitting ? 'Creating account…' : 'Sign up'}
        </Button>
      </Form>

      {needsSetup ? null : (
        <p className="mt-4 text-sm text-ink-muted">
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-accent hover:underline">
            Sign in
          </Link>
        </p>
      )}
    </AuthLayout>
  );
}
