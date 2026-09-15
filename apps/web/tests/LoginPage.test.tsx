import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { LoginPage } from '../src/features/auth/LoginPage';

function renderLoginPage(action?: () => unknown) {
  const router = createMemoryRouter([{ path: '/login', element: <LoginPage />, action }], {
    initialEntries: ['/login'],
  });

  return render(<RouterProvider router={router} />);
}

describe('LoginPage', () => {
  it('labels its fields so they can be found by name, not by position', async () => {
    renderLoginPage();

    expect(await screen.findByLabelText('Email')).toHaveAttribute('type', 'email');
    expect(screen.getByLabelText('Password')).toHaveAttribute('type', 'password');
  });

  it('submits what was typed', async () => {
    const action = vi.fn(async ({ request }: { request: Request }) => {
      const formData = await request.formData();

      return { submitted: Object.fromEntries(formData) };
    });

    renderLoginPage(action as unknown as () => unknown);

    await userEvent.type(await screen.findByLabelText('Email'), 'owner@example.com');
    await userEvent.type(screen.getByLabelText('Password'), 'a-long-enough-passphrase');
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(action).toHaveBeenCalled();
    const result = await action.mock.results[0]?.value;
    expect(result.submitted).toEqual({
      email: 'owner@example.com',
      password: 'a-long-enough-passphrase',
    });
  });

  it('shows the message the server sent back, announced to screen readers', async () => {
    renderLoginPage(() => ({ error: 'Invalid email or password' }));

    await userEvent.type(await screen.findByLabelText('Email'), 'owner@example.com');
    await userEvent.type(screen.getByLabelText('Password'), 'wrong');
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid email or password');
  });

  it('shows no error before anything has been submitted', async () => {
    renderLoginPage();

    await screen.findByLabelText('Email');

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
