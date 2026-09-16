import { Form, Link, redirect, useActionData, useNavigation } from 'react-router';
import type { ActionFunctionArgs } from 'react-router';
import { Button } from '../../components/Button';
import { TextField } from '../../components/TextField';
import { AuthLayout } from '../../layouts/AuthLayout';
import { toUserMessage } from '../../lib/apiClient';
import { fetchCurrentUser, fetchSetupStatus, login } from './auth.api';

type LoginActionResult = {
  error: string;
};

export async function loginPageLoader(): Promise<null> {
  if ((await fetchCurrentUser()) !== null) {
    throw redirect('/');
  }

  // A brand new instance has no account to sign in with yet.
  if ((await fetchSetupStatus()).needsSetup) {
    throw redirect('/register');
  }

  return null;
}

export async function loginAction({ request }: ActionFunctionArgs) {
  const formData = await request.formData();

  try {
    await login({
      email: String(formData.get('email') ?? ''),
      password: String(formData.get('password') ?? ''),
    });
  } catch (error) {
    return { error: toUserMessage(error, 'Could not sign in. Please try again.') };
  }

  return redirect('/');
}

export function LoginPage() {
  const actionResult = useActionData() as LoginActionResult | undefined;
  const navigation = useNavigation();
  const isSubmitting = navigation.state === 'submitting';

  return (
    <AuthLayout title="Sign in to TestBrain" description="Use your TestBrain account.">
      <Form method="post" className="space-y-4">
        {actionResult === undefined ? null : (
          <p
            role="alert"
            className="rounded-md border border-danger-border bg-danger-surface px-3 py-2 text-sm text-danger"
          >
            {actionResult.error}
          </p>
        )}

        <TextField label="Email" name="email" type="email" autoComplete="email" required />

        <TextField
          label="Password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />

        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Signing in…' : 'Sign in'}
        </Button>
      </Form>

      <p className="mt-4 text-sm text-ink-muted">
        New here?{' '}
        <Link to="/register" className="font-medium text-accent hover:underline">
          Sign up
        </Link>
      </p>
    </AuthLayout>
  );
}
